import type { UtxoExplorer } from '../../Explorer/UtxoExplorer';
import type { UtxoNetworkParams } from '../../ChainGate/networks/types';
import { BaseUtxoTransaction, buildRecommendedFees } from './BaseUtxoTransaction';
import type {
  Txo,
  UtxoApiState,
  UtxoFee,
  UtxoFeeTier,
  UtxoRecommendedFee,
  UtxoRecommendedFees,
} from './BaseUtxoTransaction';
import { bytesToHex, hexToBytes } from '../../utils';
import bitcoreCash from 'bitcore-lib-cash';
import * as bchaddrjs from 'bchaddrjs';

// Re-export unified fee types under BCH-specific aliases.
export type BchFee = UtxoFee;
export type BchFeeTier = UtxoFeeTier;
export type BchRecommendedFee = UtxoRecommendedFee;
export type BchRecommendedFees = UtxoRecommendedFees;

/**
 * An unsigned Bitcoin Cash transaction prepared by {@link BchConnector.transfer}.
 *
 * Addresses are stored internally in **legacy** format so `@scure/btc-signer`
 * can handle UTXO selection.  Signing uses `bitcore-lib-cash` (which handles
 * `SIGHASH_FORKID` internally) with addresses converted back to CashAddr.
 *
 * @example
 * ```ts
 * const amount = cg.networks.bitcoincash.amount('0.01');
 * const tx = await bch.transfer(amount, 'bitcoincash:qq...');
 * const fees = tx.recommendedFees();
 * tx.setFee('high');
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
    const fromAddress = bchaddrjs.toLegacyAddress(rawFrom);
    const toAddress = bchaddrjs.toLegacyAddress(rawTo);

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
  // Transaction signing via bitcore-lib-cash
  // ---------------------------------------------------------------------------

  /**
   * Signs the transaction using `bitcore-lib-cash`.
   *
   * Inputs use legacy addresses / raw scripts.
   * Output addresses are converted to CashAddr for `bitcore-lib-cash`.
   */
  protected signTransaction(
    inputs: Txo[],
    outputs: Array<{ address: string; amount: bigint }>,
    privateKey: Uint8Array,
  ): Uint8Array {
    let transaction = new bitcoreCash.Transaction();

    transaction = transaction.from(
      inputs.map(
        (input) =>
          new bitcoreCash.Transaction.UnspentOutput({
            txId: input.txid,
            outputIndex: input.n,
            script: bitcoreCash.Script.fromHex(bytesToHex(input.script)),
            satoshis: Number(input.amount),
          }),
      ),
    );

    for (const output of outputs) {
      const cashAddr = bchaddrjs.toCashAddress(output.address);
      transaction = transaction.addOutput(
        new bitcoreCash.Transaction.Output({
          satoshis: Number(output.amount),
          script: bitcoreCash.Script.fromAddress(bitcoreCash.Address.fromString(cashAddr)),
        }),
      );
    }

    const privateKeyHex = bytesToHex(privateKey);
    transaction = transaction.sign(privateKeyHex);

    return hexToBytes(transaction.serialize());
  }
}
