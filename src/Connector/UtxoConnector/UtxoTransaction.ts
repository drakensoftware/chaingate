import * as btc from '@scure/btc-signer';
import { OutScript } from '@scure/btc-signer';
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
import { hexToBytes } from '../../utils';

// Re-export fee types.
export type { UtxoFee, UtxoFeeTier, UtxoRecommendedFee, UtxoRecommendedFees };

/**
 * An unsigned UTXO transaction prepared by {@link UtxoConnector.transfer}.
 *
 * The transaction is created with "normal" recommended fees. Before sending,
 * you can inspect or change the fee:
 *
 * @example
 * ```ts
 * const amount = cg.networks.bitcoin.amount('0.001');
 * const tx = await btc.transfer(amount, 'bc1q...');
 *
 * // Inspect recommended fees
 * const fees = tx.recommendedFees();
 * console.log(fees.normal.enoughFunds);
 *
 * // Override with a specific tier
 * tx.setFee(fees.high);
 *
 * // Or set a custom fee rate
 * tx.setFee({ feePerKbSat: 50_000n });
 *
 * // Sign and broadcast
 * const broadcasted = await tx.signAndBroadcast();
 * ```
 */
export class UtxoTransaction extends BaseUtxoTransaction {
  /** @internal — used by UtxoConnector.transfer to build the transaction. */
  static async create(params: {
    explorer: UtxoExplorer;
    fromAddress: string;
    toAddress: string;
    valueSat: bigint;
    networkParams: UtxoNetworkParams;
    getPrivateKey: () => Promise<Uint8Array>;
  }): Promise<UtxoTransaction> {
    const { explorer, fromAddress, toAddress, valueSat, networkParams, getPrivateKey } = params;

    // Fetch fee rates.
    const feeRateResult = await explorer.getFeeRate();

    // Gather UTXOs and compute fee estimates for each tier.
    // Seed with locally cached unspent UTXOs (change outputs from previous broadcasts).
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

    return new UtxoTransaction({
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
  // Transaction signing via @scure/btc-signer
  // ---------------------------------------------------------------------------

  /** Signs the transaction and returns the serialized raw bytes. */
  protected signTransaction(
    inputs: Txo[],
    outputs: Array<{ address: string; amount: bigint }>,
    privateKey: Uint8Array,
  ): Uint8Array {
    const txVins = inputs.map((vin) => ({
      txid: hexToBytes(vin.txid),
      index: vin.n,
      witnessUtxo: {
        script: vin.script,
        amount: vin.amount.min(),
      },
    }));

    const txVouts = outputs.map((vout) => ({
      script: OutScript.encode(btc.Address(this.networkParams).decode(vout.address)),
      amount: vout.amount,
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
}
