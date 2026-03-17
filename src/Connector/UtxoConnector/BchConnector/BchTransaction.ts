import type { UtxoExplorer } from '../../../Explorer/UtxoExplorer';
import type { UtxoNetworkParams } from '../../../ChainGate/networks/types';
import { BaseUtxoTransaction, buildRecommendedFees } from '../BaseUtxoTransaction';
import type {
  Txo,
  UtxoApiState,
  UtxoFee,
  UtxoFeeTier,
  UtxoRecommendedFee,
  UtxoRecommendedFees,
} from '../BaseUtxoTransaction';
import { toLegacyAddress } from './cashaddr';
import { signBchTransaction } from './bch';

// Re-export unified fee types under BCH-specific aliases.
export type BchFee = UtxoFee;
export type BchFeeTier = UtxoFeeTier;
export type BchRecommendedFee = UtxoRecommendedFee;
export type BchRecommendedFees = UtxoRecommendedFees;

/**
 * An unsigned Bitcoin Cash transaction prepared by {@link BchConnector.transfer}.
 *
 * @example
 * ```ts
 * const amount = cg.networks.bitcoincash.amount('0.01');
 * const tx = await bch.transfer(amount, 'bitcoincash:qq...');
 * const fees = tx.recommendedFees();
 * tx.setFee(fees.high);
 * const broadcasted = await tx.signAndBroadcast();
 * ```
 */
export class BchTransaction extends BaseUtxoTransaction {
  /**
   * Creates a BCH transaction, converting addresses to legacy for UTXO selection.
   * @internal
   */
  static async create(params: {
    explorer: UtxoExplorer;
    fromAddress: string;
    toAddress: string;
    valueSat: bigint;
    networkParams: UtxoNetworkParams;
    getPrivateKey: () => Promise<Uint8Array>;
  }): Promise<BchTransaction> {
    const {
      explorer,
      fromAddress: rawFrom,
      toAddress: rawTo,
      valueSat,
      networkParams,
      getPrivateKey,
    } = params;

    // Convert addresses to legacy format for @scure/btc-signer compatibility
    // (it doesn't understand CashAddr encoding).
    const fromAddress = toLegacyAddress(rawFrom);
    const toAddress = toLegacyAddress(rawTo);

    // Fetch fee rates.
    const feeRateResult = await explorer.getFeeRate();

    // Gather UTXOs and compute fee estimates for each tier.
    const cachedUnspent = explorer.global.utxoCache.getUnspent(fromAddress);
    const state: UtxoApiState = { utxos: [...cachedUnspent], page: 0, crawled: false };

    const feeRates = await buildRecommendedFees(
      feeRateResult,
      explorer,
      fromAddress,
      toAddress,
      valueSat,
      networkParams,
      state,
    );

    return new BchTransaction({
      explorer,
      fromAddress,
      toAddress,
      valueSat,
      networkParams,
      feeRates,
      getPrivateKey,
      state,
    });
  }

  // ---------------------------------------------------------------------------
  // Transaction signing
  // ---------------------------------------------------------------------------

  /** Signs the transaction and returns the serialized raw bytes. */
  protected signTransaction(
    inputs: Txo[],
    outputs: Array<{ address: string; amount: bigint }>,
    privateKey: Uint8Array,
  ): Uint8Array {
    return signBchTransaction(
      inputs.map((input) => ({
        txid: input.txid,
        n: input.n,
        script: input.script,
        amount: input.amount.min(),
      })),
      outputs,
      privateKey,
      this.networkParams,
    );
  }
}
