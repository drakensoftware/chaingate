/**
 * Abstract base class for UTXO-family transactions (BTC/LTC/DOGE/BCH).
 *
 * Contains all shared logic: fee estimation, UTXO gathering/selection,
 * sign-and-broadcast flow, and local UTXO cache management.
 *
 * Subclasses only need to implement {@link signTransaction} (network-specific
 * signing) and a static `create()` factory.
 *
 * @internal
 */

import Decimal from 'decimal.js';
import * as btc from '@scure/btc-signer';
import { OutScript } from '@scure/btc-signer';
import type { UtxoExplorer } from '../../Explorer/UtxoExplorer';
import type { UtxoFeeRateResponse } from '../../Client';
import type { UtxoNetworkParams } from '../../ChainGate/networks/types';
import { NotEnoughFundsError, TransactionAlreadySentError } from '../../errors';
import { BroadcastedUtxoTransaction } from './BroadcastedUtxoTransaction';
import { hexToBytes, bytesToHex } from '../../utils';
import { Amount } from '../../utils/Amount';

// ---------------------------------------------------------------------------
// Shared types
// ---------------------------------------------------------------------------

/** Fee tier names (shared by all UTXO-family transactions). */
export type UtxoFeeTier = 'low' | 'normal' | 'high' | 'maximum';

/** Custom fee parameters for UTXO transactions. */
export interface UtxoFee {
  /** Fee rate in satoshis per kilobyte. */
  feePerKbSat: bigint;
}

/** A recommended fee tier with per-kB rate, estimated amount, confirmation time, and balance check. */
export interface UtxoRecommendedFee {
  /** Fee rate in satoshis per kilobyte. */
  feePerKbSat: bigint;
  /** Estimated fee for this specific transaction in satoshis, or `null` if not enough funds. */
  estimatedFeeSat: bigint | null;
  /** Estimated seconds until confirmation. */
  estimatedConfirmationSecs: number;
  /** Whether the wallet has enough funds to cover the transfer plus this fee. */
  enoughFunds: boolean;
  /**
   * Additional satoshis needed for the transaction to be broadcastable at this fee.
   * Present only when `enoughFunds` is `false`, and `null` when the gap cannot
   * be estimated.
   */
  missingFunds?: bigint | null;
}

/** All recommended fee tiers. */
export interface UtxoRecommendedFees {
  low: UtxoRecommendedFee;
  normal: UtxoRecommendedFee;
  high: UtxoRecommendedFee;
  maximum: UtxoRecommendedFee;
}

/** Internal UTXO representation. */
export interface Txo {
  txid: string;
  amount: Amount;
  n: number;
  script: Uint8Array;
}

/** Internal UTXO-gathering state. */
export interface UtxoApiState {
  page: number;
  utxos: Txo[];
  crawled: boolean;
}

/** Constructor parameters for BaseUtxoTransaction. */
export interface BaseUtxoTransactionParams {
  explorer: UtxoExplorer;
  fromAddress: string;
  toAddress: string;
  valueSat: bigint;
  networkParams: UtxoNetworkParams;
  feeRates: UtxoRecommendedFees;
  getPrivateKey: () => Promise<Uint8Array>;
  state: UtxoApiState;
}

// ---------------------------------------------------------------------------
// Abstract base class
// ---------------------------------------------------------------------------

export abstract class BaseUtxoTransaction {
  protected readonly explorer: UtxoExplorer;
  protected readonly fromAddress: string;
  protected readonly toAddress: string;
  protected readonly valueSat: bigint;
  protected readonly networkParams: UtxoNetworkParams;
  protected readonly feeRates: UtxoRecommendedFees;
  protected readonly getPrivateKey: () => Promise<Uint8Array>;
  protected readonly state: UtxoApiState;

  protected currentFeePerKbSat: bigint;
  protected sent = false;

  /** @internal */
  constructor(params: BaseUtxoTransactionParams) {
    this.explorer = params.explorer;
    this.fromAddress = params.fromAddress;
    this.toAddress = params.toAddress;
    this.valueSat = params.valueSat;
    this.networkParams = params.networkParams;
    this.feeRates = params.feeRates;
    this.getPrivateKey = params.getPrivateKey;
    this.state = params.state;

    this.currentFeePerKbSat = params.feeRates.normal.feePerKbSat;
  }

  // -------------------------------------------------------------------------
  // Public API
  // -------------------------------------------------------------------------

  /**
   * Returns all recommended fee tiers (low, normal, high, maximum).
   */
  public recommendedFees(): UtxoRecommendedFees {
    return this.feeRates;
  }

  /**
   * Returns whether the wallet has enough funds to cover the transfer plus fee
   * at the current fee rate.
   */
  public enoughFunds(): boolean {
    return !!this.selectUtxos(this.currentFeePerKbSat);
  }

  /**
   * Returns the estimated virtual size (vbytes) of this transaction at the
   * current fee rate, or `null` if there are not enough funds.
   */
  public estimatedSizeBytes(): number | null {
    const selected = this.selectUtxos(this.currentFeePerKbSat);
    if (!selected) return null;
    return Math.ceil(selected.weight / 4);
  }

  /**
   * Sets the fee for this transaction.
   *
   * Pass a tier object from {@link recommendedFees} or an object with a
   * custom `feePerKbSat` value in satoshis per kilobyte.
   *
   * @throws {@link TransactionAlreadySentError} if the transaction has already been sent.
   */
  public setFee(fee: UtxoRecommendedFee | UtxoFee): void {
    if (this.sent) {
      throw new TransactionAlreadySentError();
    }
    this.currentFeePerKbSat = fee.feePerKbSat;
  }

  /**
   * Signs the transaction with the wallet's private key and broadcasts it to the network.
   *
   * @throws {@link TransactionAlreadySentError} if the transaction has already been sent.
   * @throws {@link NotEnoughFundsError} if the wallet does not have enough funds.
   */
  public async signAndBroadcast(): Promise<BroadcastedUtxoTransaction> {
    if (this.sent) {
      throw new TransactionAlreadySentError();
    }
    if (!this.enoughFunds()) {
      throw new NotEnoughFundsError();
    }

    // Gather UTXOs and select inputs/outputs.
    await this.findUtxos(this.currentFeePerKbSat);
    const selected = this.selectUtxos(this.currentFeePerKbSat);
    if (!selected) {
      throw new NotEnoughFundsError();
    }

    // Build and sign the raw transaction.
    const privateKey = await this.getPrivateKey();
    const rawTx = this.signTransaction(selected.inputs, selected.outputs, privateKey);
    privateKey.fill(0);

    // Broadcast.
    const { txId } = await this.explorer.broadcastTransaction(bytesToHex(rawTx));
    this.sent = true;

    // Update local UTXO cache: mark spent inputs, add change outputs.
    const cache = this.explorer.global.utxoCache;
    for (const input of selected.inputs) {
      cache.markSpent(input.txid, input.n, txId);
    }
    const fromScript = OutScript.encode(btc.Address(this.networkParams).decode(this.fromAddress));
    for (let i = 0; i < selected.outputs.length; i++) {
      if (selected.outputs[i].address === this.fromAddress) {
        cache.addUnspent(this.fromAddress, {
          txid: txId,
          n: i,
          amount: this.explorer.amountFromSat(selected.outputs[i].amount),
          script: fromScript,
        });
      }
    }

    return new BroadcastedUtxoTransaction(txId, this.explorer);
  }

  // -------------------------------------------------------------------------
  // Abstract — subclasses provide network-specific signing
  // -------------------------------------------------------------------------

  /**
   * Signs a transaction given the selected inputs, outputs, and private key.
   * Returns the serialized raw transaction bytes.
   */
  protected abstract signTransaction(
    inputs: Txo[],
    outputs: Array<{ address: string; amount: bigint }>,
    privateKey: Uint8Array,
  ): Uint8Array;

  // -------------------------------------------------------------------------
  // UTXO gathering
  // -------------------------------------------------------------------------

  /** Fetches UTXOs page by page until we have enough to cover the tx, or all are fetched. */
  protected async findUtxos(feePerKbSat: bigint): Promise<void> {
    if (this.selectUtxos(feePerKbSat)) return;

    while (!this.state.crawled) {
      const result = await this.explorer.getUtxosByAddress(
        this.fromAddress,
        this.state.page.toString(),
      );

      if (result.utxos.length === 0) {
        this.state.crawled = true;
        break;
      }

      const cache = this.explorer.global.utxoCache;
      for (const utxo of result.utxos) {
        // Skip duplicates.
        if (this.state.utxos.some((u) => u.txid === utxo.txid && u.n === utxo.n)) continue;
        // Skip UTXOs that have been spent by a local broadcast.
        if (cache.isSpent(utxo.txid, utxo.n)) continue;

        this.state.utxos.push({
          txid: utxo.txid,
          amount: utxo.amount,
          n: utxo.n,
          script: hexToBytes(utxo.script),
        });
      }

      if (this.selectUtxos(feePerKbSat)) return;
      this.state.page++;
    }
  }

  // -------------------------------------------------------------------------
  // UTXO selection via @scure/btc-signer
  // -------------------------------------------------------------------------

  /** Attempts to select UTXOs and compute outputs. Returns null if insufficient. */
  protected selectUtxos(feePerKbSat: bigint): {
    inputs: Txo[];
    outputs: Array<{ address: string; amount: bigint }>;
    fee: bigint;
    weight: number;
  } | null {
    if (this.state.utxos.length === 0) return null;

    const vins = this.state.utxos.map((utxo) => ({
      txid: hexToBytes(utxo.txid),
      index: utxo.n,
      witnessUtxo: {
        script: utxo.script,
        amount: utxo.amount.min(),
      },
    }));

    const vouts = [{ address: this.toAddress, amount: this.valueSat }];
    const feePerByte = feePerKbSat / 1000n || 1n;

    const selected = btc.selectUTXO(vins, vouts, 'default', {
      changeAddress: this.fromAddress,
      feePerByte,
      bip69: true,
      createTx: true,
      allowLegacyWitnessUtxo: true,
      network: this.networkParams,
    });

    if (!selected) return null;

    const inputs: Txo[] = selected.inputs.map((input) => ({
      txid: bytesToHex(input.txid!),
      amount: this.explorer.amountFromSat(input.witnessUtxo!.amount),
      n: input.index ?? 0,
      script: input.witnessUtxo!.script,
    }));

    const outputs = selected.outputs.map((output) => {
      if (!('address' in output)) {
        // change output — should not happen with createTx but handle gracefully
        return { address: this.fromAddress, amount: output.amount };
      }
      return { address: output.address!, amount: output.amount };
    });

    return { inputs, outputs, fee: selected.fee ?? 0n, weight: selected.weight };
  }
}

// ---------------------------------------------------------------------------
// Fee tier computation (runs once during create)
// ---------------------------------------------------------------------------

/**
 * Builds recommended fee tiers by fetching UTXOs and running selection for each tier.
 * Shared by all UTXO-family transaction `create()` factories.
 * @internal
 */
export async function buildRecommendedFees(
  apiResponse: UtxoFeeRateResponse,
  explorer: UtxoExplorer,
  fromAddress: string,
  toAddress: string,
  valueSat: bigint,
  networkParams: UtxoNetworkParams,
  state: UtxoApiState,
): Promise<UtxoRecommendedFees> {
  const tiers: UtxoFeeTier[] = ['low', 'normal', 'high', 'maximum'];
  const results: Partial<UtxoRecommendedFees> = {};

  for (const tier of tiers) {
    const entry = apiResponse[tier];
    const feePerKbSat = BigInt(new Decimal(entry.feePerKb).toFixed(0));

    // Try to gather UTXOs and select to compute the actual fee.
    const tempTx = new TempUtxoSelector(
      explorer,
      fromAddress,
      toAddress,
      valueSat,
      networkParams,
      state,
    );

    await tempTx.findUtxos(feePerKbSat);
    const selected = tempTx.selectUtxos(feePerKbSat);

    const result: UtxoRecommendedFee = {
      feePerKbSat,
      estimatedFeeSat: selected ? selected.fee : null,
      estimatedConfirmationSecs: entry.confirmationTimeSecs,
      enoughFunds: !!selected,
    };
    if (!selected) {
      result.missingFunds = estimateMissingFunds({
        utxos: state.utxos,
        fromAddress,
        toAddress,
        valueSat,
        feePerKbSat,
        networkParams,
      });
    }
    results[tier] = result;
  }

  return results as UtxoRecommendedFees;
}

/**
 * Estimates the satoshis missing for a transaction to succeed at a given fee
 * rate by re-running selection with a synthetic high-value input that uses the
 * same script type as the sender's address. Returns `null` when the gap cannot
 * be estimated.
 * @internal
 */
export function estimateMissingFunds(params: {
  utxos: Txo[];
  fromAddress: string;
  toAddress: string;
  valueSat: bigint;
  feePerKbSat: bigint;
  networkParams: UtxoNetworkParams;
}): bigint | null {
  const { utxos, fromAddress, toAddress, valueSat, feePerKbSat, networkParams } = params;

  const totalAvailable = utxos.reduce((sum, u) => sum + u.amount.min(), 0n);
  const fromScript = OutScript.encode(btc.Address(networkParams).decode(fromAddress));
  const dummyAmount = valueSat + 100_000_000_000n;

  const vins = [
    ...utxos.map((utxo) => ({
      txid: hexToBytes(utxo.txid),
      index: utxo.n,
      witnessUtxo: { script: utxo.script, amount: utxo.amount.min() },
    })),
    {
      txid: new Uint8Array(32),
      index: 0,
      witnessUtxo: { script: fromScript, amount: dummyAmount },
    },
  ];

  const vouts = [{ address: toAddress, amount: valueSat }];
  const feePerByte = feePerKbSat / 1000n || 1n;

  const selected = btc.selectUTXO(vins, vouts, 'all', {
    changeAddress: fromAddress,
    feePerByte,
    bip69: true,
    createTx: false,
    allowLegacyWitnessUtxo: true,
    network: networkParams,
  });

  if (!selected) return null;

  const totalNeeded = valueSat + (selected.fee ?? 0n);
  return totalNeeded > totalAvailable ? totalNeeded - totalAvailable : null;
}

/**
 * Lightweight helper used only during fee estimation.
 * Shares the UtxoApiState with the main transaction so UTXOs fetched
 * during fee estimation are reused when signing.
 */
class TempUtxoSelector {
  private readonly explorer: UtxoExplorer;
  private readonly fromAddress: string;
  private readonly toAddress: string;
  private readonly valueSat: bigint;
  private readonly networkParams: UtxoNetworkParams;
  private readonly state: UtxoApiState;

  constructor(
    explorer: UtxoExplorer,
    fromAddress: string,
    toAddress: string,
    valueSat: bigint,
    networkParams: UtxoNetworkParams,
    state: UtxoApiState,
  ) {
    this.explorer = explorer;
    this.fromAddress = fromAddress;
    this.toAddress = toAddress;
    this.valueSat = valueSat;
    this.networkParams = networkParams;
    this.state = state;
  }

  async findUtxos(feePerKbSat: bigint): Promise<void> {
    if (this.selectUtxos(feePerKbSat)) return;

    while (!this.state.crawled) {
      const result = await this.explorer.getUtxosByAddress(
        this.fromAddress,
        this.state.page.toString(),
      );

      if (result.utxos.length === 0) {
        this.state.crawled = true;
        break;
      }

      const cache = this.explorer.global.utxoCache;
      for (const utxo of result.utxos) {
        if (this.state.utxos.some((u) => u.txid === utxo.txid && u.n === utxo.n)) continue;
        if (cache.isSpent(utxo.txid, utxo.n)) continue;

        this.state.utxos.push({
          txid: utxo.txid,
          amount: utxo.amount,
          n: utxo.n,
          script: hexToBytes(utxo.script),
        });
      }

      if (this.selectUtxos(feePerKbSat)) return;
      this.state.page++;
    }
  }

  selectUtxos(feePerKbSat: bigint): { fee: bigint } | null {
    if (this.state.utxos.length === 0) return null;

    const vins = this.state.utxos.map((utxo) => ({
      txid: hexToBytes(utxo.txid),
      index: utxo.n,
      witnessUtxo: { script: utxo.script, amount: utxo.amount.min() },
    }));

    const vouts = [{ address: this.toAddress, amount: this.valueSat }];
    const feePerByte = feePerKbSat / 1000n || 1n;

    const selected = btc.selectUTXO(vins, vouts, 'default', {
      changeAddress: this.fromAddress,
      feePerByte,
      bip69: true,
      createTx: true,
      allowLegacyWitnessUtxo: true,
      network: this.networkParams,
    });

    if (!selected) return null;
    return { fee: selected.fee ?? 0n };
  }
}
