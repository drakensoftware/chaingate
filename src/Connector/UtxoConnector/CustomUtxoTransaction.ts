import Decimal from 'decimal.js';
import * as btc from '@scure/btc-signer';
import { OutScript } from '@scure/btc-signer';
import type { UtxoExplorer } from '../../Explorer/UtxoExplorer';
import type { UtxoNetworkParams } from '../../ChainGate/networks/types';
import { TransactionAlreadySentError } from '../../errors';
import { BroadcastedUtxoTransaction } from './BroadcastedUtxoTransaction';
import type {
  UtxoFee,
  UtxoFeeTier,
  UtxoRecommendedFee,
  UtxoRecommendedFees,
} from './BaseUtxoTransaction';
import { hexToBytes, bytesToHex } from '../../utils';
import type { Amount } from '../../utils/Amount';

// ---------------------------------------------------------------------------
// Public types
// ---------------------------------------------------------------------------

/** A single UTXO input for a custom transaction. */
export interface UtxoCustomInput {
  /** Transaction ID of the UTXO to spend. */
  txid: string;
  /** Output index within the referenced transaction. */
  index: number;
  /** UTXO value. */
  amount: Amount;
  /** Locking script of the UTXO (hex-encoded). */
  script: string;
}

/** A single output for a custom transaction. */
export interface UtxoCustomOutput {
  /** Recipient address. */
  address: string;
  /** Amount to send. */
  amount: Amount;
}

/** Parameters accepted by {@link CustomUtxoTransaction}. */
export interface CustomUtxoTransactionParams {
  /** Inputs to spend. */
  inputs: UtxoCustomInput[];
  /** Outputs to create. */
  outputs: UtxoCustomOutput[];
}

// ---------------------------------------------------------------------------
// Internal constructor params
// ---------------------------------------------------------------------------

/** @internal */
interface InternalParams {
  explorer: UtxoExplorer;
  networkParams: UtxoNetworkParams;
  inputs: UtxoCustomInput[];
  outputs: UtxoCustomOutput[];
  getPrivateKey: () => Promise<Uint8Array>;
  signTransaction: (
    inputs: UtxoCustomInput[],
    outputs: UtxoCustomOutput[],
    privateKey: Uint8Array,
    networkParams: UtxoNetworkParams,
  ) => Uint8Array;
}

// ---------------------------------------------------------------------------
// Custom transaction class
// ---------------------------------------------------------------------------

/**
 * A UTXO transaction with caller-defined inputs and outputs.
 *
 * The fee is implicitly the difference between the sum of input amounts and
 * the sum of output amounts.
 */
export class CustomUtxoTransaction {
  private readonly explorer: UtxoExplorer;
  private readonly networkParams: UtxoNetworkParams;
  private readonly inputList: UtxoCustomInput[];
  private readonly outputList: UtxoCustomOutput[];
  private readonly getPrivateKey: () => Promise<Uint8Array>;
  private readonly _signTransaction: InternalParams['signTransaction'];
  private sent = false;

  /** @internal */
  constructor(params: InternalParams) {
    this.explorer = params.explorer;
    this.networkParams = params.networkParams;
    this.inputList = [...params.inputs];
    this.outputList = [...params.outputs];
    this.getPrivateKey = params.getPrivateKey;
    this._signTransaction = params.signTransaction;
  }

  // -------------------------------------------------------------------------
  // Accessors
  // -------------------------------------------------------------------------

  /** Returns the inputs that will be spent. */
  public inputs(): readonly UtxoCustomInput[] {
    return this.inputList;
  }

  /** Returns the outputs that will be created. */
  public outputs(): readonly UtxoCustomOutput[] {
    return this.outputList;
  }

  /**
   * Returns the implied fee (sum of inputs minus sum of outputs).
   *
   * A negative value means the outputs exceed the inputs — the transaction
   * would be invalid.
   */
  public fee(): Amount {
    const totalIn = this.inputList.reduce((sum, i) => sum + i.amount.min(), 0n);
    const totalOut = this.outputList.reduce((sum, o) => sum + o.amount.min(), 0n);
    return this.explorer.amountFromSat(totalIn - totalOut);
  }

  /**
   * Returns the estimated virtual size (vbytes) of this transaction.
   *
   * Returns `null` if the transaction has no inputs or no outputs.
   */
  public estimatedSizeBytes(): number | null {
    if (this.inputList.length === 0 || this.outputList.length === 0) return null;

    const result = this.runSelection(1n);
    if (!result) return null;

    return Math.ceil(result.weight / 4);
  }

  // -------------------------------------------------------------------------
  // Mutation
  // -------------------------------------------------------------------------

  /**
   * Appends an input to the transaction.
   *
   * @throws {@link TransactionAlreadySentError} if already broadcast.
   */
  public addInput(input: UtxoCustomInput): void {
    this.guardNotSent();
    this.inputList.push(input);
  }

  /**
   * Removes an input identified by its transaction ID and output index.
   *
   * @returns `true` if the input was found and removed.
   * @throws {@link TransactionAlreadySentError} if already broadcast.
   */
  public removeInput(txid: string, index: number): boolean {
    this.guardNotSent();
    const idx = this.inputList.findIndex((i) => i.txid === txid && i.index === index);
    if (idx === -1) return false;
    this.inputList.splice(idx, 1);
    return true;
  }

  /**
   * Appends an output to the transaction.
   *
   * @throws {@link TransactionAlreadySentError} if already broadcast.
   */
  public addOutput(output: UtxoCustomOutput): void {
    this.guardNotSent();
    this.outputList.push(output);
  }

  /**
   * Removes an output by its position in the outputs list.
   *
   * @returns `true` if the index was valid and the output was removed.
   * @throws {@link TransactionAlreadySentError} if already broadcast.
   */
  public removeOutput(index: number): boolean {
    this.guardNotSent();
    if (index < 0 || index >= this.outputList.length) return false;
    this.outputList.splice(index, 1);
    return true;
  }

  // -------------------------------------------------------------------------
  // Change address & fee estimation
  // -------------------------------------------------------------------------

  /**
   * Sets a change address and computes the change output automatically.
   *
   * Appends a change output whose amount equals the remaining value after
   * subtracting all other outputs and the estimated fee. If the change
   * amount is below the dust threshold, no change output is added and
   * the remainder goes entirely to fees.
   *
   * @param address - The address to receive the change.
   * @param fee - A tier object from {@link recommendedFees} or an explicit fee rate.
   * @throws {@link TransactionAlreadySentError} if already broadcast.
   * @throws {Error} if inputs or outputs are empty, or if outputs exceed inputs.
   */
  public setChangeAddress(address: string, fee: UtxoRecommendedFee | UtxoFee): void {
    this.guardNotSent();

    const feePerByte = fee.feePerKbSat / 1000n || 1n;

    if (this.inputList.length === 0) {
      throw new Error('Cannot set change address: no inputs.');
    }

    const result = this.runSelection(feePerByte, address);
    if (!result) {
      throw new Error('Cannot compute change: outputs exceed inputs at the given fee rate.');
    }

    // If selectUTXO added a change output, append it to our output list.
    if (result.change) {
      // The change output is the last one appended by selectUTXO.
      const changeOutput = result.outputs[result.outputs.length - 1];
      if ('address' in changeOutput) {
        this.outputList.push({
          address: changeOutput.address,
          amount: this.explorer.amountFromSat(changeOutput.amount),
        });
      }
    }
  }

  /**
   * Returns recommended fees for each priority tier.
   *
   * Fee rates are fetched from the network. For each tier, the estimated fee
   * is computed from the current inputs and outputs.
   *
   * Returns `null` if the transaction has no inputs or no outputs.
   */
  public async recommendedFees(): Promise<UtxoRecommendedFees | null> {
    if (this.inputList.length === 0 || this.outputList.length === 0) return null;

    const totalIn = this.inputList.reduce((sum, i) => sum + i.amount.min(), 0n);
    const feeRateResult = await this.explorer.getFeeRate();

    const tiers: UtxoFeeTier[] = ['low', 'normal', 'high', 'maximum'];
    const results: Partial<UtxoRecommendedFees> = {};

    for (const tier of tiers) {
      const entry = feeRateResult[tier];
      const feePerKbSat = BigInt(new Decimal(entry.feePerKb).toFixed(0));
      const feePerByte = feePerKbSat / 1000n || 1n;

      const selected = this.runSelection(feePerByte);
      const estimatedFeeSat = selected ? (selected.fee ?? null) : null;
      const enoughFunds = estimatedFeeSat !== null && totalIn >= (estimatedFeeSat ?? 0n);

      const result: UtxoRecommendedFee = {
        feePerKbSat,
        estimatedFeeSat,
        estimatedConfirmationSecs: entry.confirmationTimeSecs,
        enoughFunds,
      };
      if (!enoughFunds) {
        result.missingFunds = this.estimateMissingFunds(feePerByte, totalIn);
      }
      results[tier] = result;
    }

    return results as UtxoRecommendedFees;
  }

  /**
   * Estimates the satoshis missing for the transaction to succeed at a given
   * fee rate by re-running selection with a synthetic high-value input. Returns
   * `null` when the gap cannot be estimated.
   */
  private estimateMissingFunds(feePerByte: bigint, totalIn: bigint): bigint | null {
    const totalOut = this.outputList.reduce((sum, o) => sum + o.amount.min(), 0n);
    const syntheticScript = hexToBytes(this.inputList[0].script);
    const dummyAmount = totalOut + 100_000_000_000n;

    const vins = this.inputList.map((vin) => ({
      txid: hexToBytes(vin.txid),
      index: vin.index,
      witnessUtxo: { script: hexToBytes(vin.script), amount: vin.amount.min() },
    }));
    vins.push({
      txid: new Uint8Array(32),
      index: 0,
      witnessUtxo: { script: syntheticScript, amount: dummyAmount },
    });

    const vouts = this.outputList.map((vout) => ({
      address: vout.address,
      amount: vout.amount.min(),
    }));

    const selected = btc.selectUTXO(vins, vouts, 'all', {
      changeAddress: this.outputList[0].address,
      feePerByte,
      bip69: false,
      createTx: false,
      allowLegacyWitnessUtxo: true,
      network: this.networkParams,
    });

    if (!selected) return null;
    const estimatedFee = selected.fee ?? 0n;
    const needed = totalOut + estimatedFee;
    return needed > totalIn ? needed - totalIn : null;
  }

  // -------------------------------------------------------------------------
  // Sign & broadcast
  // -------------------------------------------------------------------------

  /**
   * Signs the transaction and broadcasts it to the network.
   *
   * @throws {@link TransactionAlreadySentError} if already broadcast.
   * @throws {Error} if outputs exceed inputs.
   */
  public async signAndBroadcast(): Promise<BroadcastedUtxoTransaction> {
    if (this.sent) {
      throw new TransactionAlreadySentError();
    }

    const impliedFee = this.fee().min();
    if (impliedFee < 0n) {
      throw new Error(
        `Transaction outputs exceed inputs. ` + `Reduce output amounts or add more inputs.`,
      );
    }

    const privateKey = await this.getPrivateKey();
    const rawTx = this._signTransaction(
      this.inputList,
      this.outputList,
      privateKey,
      this.networkParams,
    );
    privateKey.fill(0);

    const { txId } = await this.explorer.broadcastTransaction(bytesToHex(rawTx));
    this.sent = true;

    // Update local UTXO cache: mark inputs as spent.
    const cache = this.explorer.global.utxoCache;
    for (const input of this.inputList) {
      cache.markSpent(input.txid, input.index, txId);
    }

    return new BroadcastedUtxoTransaction(txId, this.explorer, this.senderAddresses());
  }

  // -------------------------------------------------------------------------
  // Internal helpers
  // -------------------------------------------------------------------------

  /**
   * Addresses that own the inputs being spent, derived from their locking
   * scripts. Returns `null` when any script has no address form (e.g. P2PK),
   * in which case confirmation is tracked block by block instead.
   */
  private senderAddresses(): string[] | null {
    const codec = btc.Address(this.networkParams);
    const addresses = new Set<string>();
    for (const input of this.inputList) {
      try {
        addresses.add(codec.encode(OutScript.decode(hexToBytes(input.script))));
      } catch {
        return null;
      }
    }
    return [...addresses];
  }

  private guardNotSent(): void {
    if (this.sent) throw new TransactionAlreadySentError();
  }

  /**
   * Runs selectUTXO with the 'all' strategy so every input is included.
   * Uses the current outputs as-is. Returns null if selection fails.
   */
  private runSelection(feePerByte: bigint, changeAddress?: string) {
    if (this.inputList.length === 0 || this.outputList.length === 0) return null;

    const vins = this.inputList.map((vin) => ({
      txid: hexToBytes(vin.txid),
      index: vin.index,
      witnessUtxo: {
        script: hexToBytes(vin.script),
        amount: vin.amount.min(),
      },
    }));

    const vouts = this.outputList.map((vout) => ({
      address: vout.address,
      amount: vout.amount.min(),
    }));

    // Use the first output address as a dummy change address when none is provided.
    // The change address only affects the output script size estimation, which is
    // negligible for size calculations.
    const resolvedChangeAddress = changeAddress ?? this.outputList[0].address;

    return (
      btc.selectUTXO(vins, vouts, 'all', {
        changeAddress: resolvedChangeAddress,
        feePerByte,
        bip69: false,
        createTx: false,
        allowLegacyWitnessUtxo: true,
        network: this.networkParams,
      }) ?? null
    );
  }
}

// ---------------------------------------------------------------------------
// Signing implementations (one per UTXO family)
// ---------------------------------------------------------------------------

/**
 * Standard UTXO signing (BTC, LTC, DOGE, tBTC).
 * @internal
 */
export function signCustomUtxoTransaction(
  inputs: UtxoCustomInput[],
  outputs: UtxoCustomOutput[],
  privateKey: Uint8Array,
  networkParams: UtxoNetworkParams,
): Uint8Array {
  const txVins = inputs.map((vin) => ({
    txid: hexToBytes(vin.txid),
    index: vin.index,
    witnessUtxo: {
      script: hexToBytes(vin.script),
      amount: vin.amount.min(),
    },
  }));

  const txVouts = outputs.map((vout) => ({
    script: OutScript.encode(btc.Address(networkParams).decode(vout.address)),
    amount: vout.amount.min(),
  }));

  const transaction = new btc.Transaction({ allowLegacyWitnessUtxo: true });
  for (const vin of txVins) transaction.addInput(vin);
  for (const vout of txVouts) transaction.addOutput(vout);

  for (let i = 0; i < transaction.inputsLength; i++) {
    transaction.signIdx(privateKey, i);
  }
  transaction.finalize();

  return hexToBytes(transaction.hex);
}
