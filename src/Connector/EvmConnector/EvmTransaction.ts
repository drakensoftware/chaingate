import Decimal from 'decimal.js';
import type { EvmExplorer } from '../../Explorer/EvmExplorer';
import type { EvmFeeRateResponse, EvmFeeGradeSchema } from '../../Client';
import { signEip1559Transaction } from '../../utils/evmTx';
import { fallbackGasFromCalldata } from '../../utils/evmGasFallback';
import { NETWORKS_INFO } from '../../ChainGate/networks';
import { UnsupportedOperationError } from '../../errors';
import { BaseEvmTransaction } from './BaseEvmTransaction';
import type { SignableTxParams } from './BaseEvmTransaction';
import { BroadcastedEvmTransaction } from './BroadcastedEvmTransaction';

/** Fee tier names. */
export type EvmFeeTier = 'low' | 'normal' | 'high' | 'maximum';

/** EIP-1559 fee parameters in wei. */
export interface EvmFee {
  /** Max fee per gas (base fee cap + tip) in wei. */
  maxFeePerGas: bigint;
  /** Max priority fee per gas (tip) in wei. */
  maxPriorityFeePerGas: bigint;
  /** Gas limit override. When omitted the auto-estimated value is kept. */
  gasLimit?: bigint;
}

/** A recommended fee tier with estimated confirmation time and balance check. */
export interface EvmRecommendedFee extends EvmFee {
  /** Estimated seconds until confirmation. */
  estimatedConfirmationSecs: number;
  /** Whether the wallet has enough funds to cover the transfer amount plus this fee. */
  enoughFunds: boolean;
  /** Additional wei needed when `enoughFunds` is `false`. */
  missingFunds?: bigint;
  /** `true` when on-chain gas estimation failed and a heuristic was used instead. */
  gasEstimationFailed?: boolean;
}

/** All recommended fee tiers. */
export interface EvmRecommendedFees {
  low: EvmRecommendedFee;
  normal: EvmRecommendedFee;
  high: EvmRecommendedFee;
  maximum: EvmRecommendedFee;
}

/** Converts Gwei string to wei bigint. */
function gweiToWei(gwei: string): bigint {
  const d = new Decimal(gwei).mul(new Decimal(10).pow(9));
  return BigInt(d.toFixed(0));
}

/** Converts an API fee grade to our EvmRecommendedFee type, computing enoughFunds. */
function gradeToFee(
  grade: EvmFeeGradeSchema,
  gasLimit: bigint,
  valueWei: bigint,
  balanceWei: bigint,
  gasEstimationFailed: boolean,
): EvmRecommendedFee {
  const maxFeeGwei = grade.maxFeePerGasGwei ?? grade.gasPriceGwei ?? '0';
  const tipGwei = grade.maxPriorityFeePerGasGwei ?? '0';
  const maxFeePerGas = gweiToWei(maxFeeGwei);
  const maxPriorityFeePerGas = gweiToWei(tipGwei);
  const totalCost = valueWei + maxFeePerGas * gasLimit;
  const enoughFunds = balanceWei >= totalCost;
  const fee: EvmRecommendedFee = {
    maxFeePerGas,
    maxPriorityFeePerGas,
    estimatedConfirmationSecs: grade.confirmationTimeSecs,
    enoughFunds,
  };
  if (!enoughFunds) {
    fee.missingFunds = totalCost - balanceWei;
  }
  if (gasEstimationFailed) {
    fee.gasEstimationFailed = true;
  }
  return fee;
}

/**
 * An unsigned EVM transaction prepared by {@link EvmConnector.transfer}.
 *
 * @example
 * ```ts
 * const amount = cg.networks.ethereum.amount('0.1');
 * const tx = await eth.transfer(amount, '0xRecipient...');
 *
 * // Inspect recommended fees
 * const fees = tx.recommendedFees();
 * console.log(fees.normal.maxFeePerGas);
 *
 * // Override with a specific tier
 * tx.setFee(fees.high);
 *
 * // Or set a manual fee with optional gas limit override
 * tx.setFee({ maxFeePerGas: 30_000_000_000n, maxPriorityFeePerGas: 2_000_000_000n, gasLimit: 50_000n });
 *
 * // Sign and broadcast
 * const broadcasted = await tx.signAndBroadcast();
 * console.log(broadcasted.transactionId);
 *
 * // Wait for confirmation
 * const cancel = broadcasted.onConfirmed((details) => {
 *   console.log('Confirmed in block', details.blockHeight);
 * });
 *
 * // Stop waiting at any time:
 * cancel();
 * ```
 */
export class EvmTransaction extends BaseEvmTransaction<BroadcastedEvmTransaction> {
  private readonly explorer: EvmExplorer;
  private readonly feeRates: EvmRecommendedFees;

  /** @internal */
  constructor(params: {
    explorer: EvmExplorer;
    fromAddress: string;
    toAddress: string;
    valueWei: bigint;
    data: string;
    nonce: bigint;
    gasLimit: bigint;
    chainId: bigint;
    balanceWei: bigint;
    feeRates: EvmRecommendedFees;
    getPrivateKey: () => Promise<Uint8Array>;
  }) {
    super({
      fromAddress: params.fromAddress,
      toAddress: params.toAddress,
      valueWei: params.valueWei,
      data: params.data,
      nonce: params.nonce,
      gasLimit: params.gasLimit,
      chainId: params.chainId,
      balanceWei: params.balanceWei,
      getPrivateKey: params.getPrivateKey,
      initialFee: {
        maxFeePerGas: params.feeRates.normal.maxFeePerGas,
        maxPriorityFeePerGas: params.feeRates.normal.maxPriorityFeePerGas,
      },
    });
    this.explorer = params.explorer;
    this.feeRates = params.feeRates;
  }

  /**
   * Returns all recommended fee tiers (low, normal, high, maximum).
   *
   * Each tier includes `maxFeePerGas`, `maxPriorityFeePerGas` (both in wei),
   * and `estimatedConfirmationSecs`.
   */
  public recommendedFees(): EvmRecommendedFees {
    return this.feeRates;
  }

  /**
   * Sets the fee for this transaction.
   *
   * Pass a tier object from {@link recommendedFees} or an object with manual
   * `maxFeePerGas`, `maxPriorityFeePerGas` (in wei), and an optional
   * `gasLimit` override.
   *
   * @throws {@link TransactionAlreadySentError} if the transaction has already been sent.
   */
  public setFee(fee: EvmRecommendedFee | EvmFee): void {
    this.applyFee(fee);
  }

  protected override signTransaction(privateKey: Uint8Array, params: SignableTxParams): string {
    return signEip1559Transaction(params, privateKey);
  }

  protected override async broadcast(signedRaw: string): Promise<string> {
    const { transactionId } = await this.explorer.broadcastTransaction(signedRaw);
    return transactionId;
  }

  protected override recordNonceUsed(): void {
    this.explorer.global.evmNonceCache.recordUsed(
      Number(this.chainId),
      this.fromAddress,
      this.nonce,
    );
  }

  protected override buildBroadcasted(transactionId: string): BroadcastedEvmTransaction {
    return new BroadcastedEvmTransaction(transactionId, this.explorer, this.fromAddress);
  }

  /** @internal — used by EvmConnector.transfer to build the transaction. */
  static async create(params: {
    explorer: EvmExplorer;
    fromAddress: string;
    toAddress: string;
    valueWei: bigint;
    data?: string;
    getPrivateKey: () => Promise<Uint8Array>;
  }): Promise<EvmTransaction> {
    const { explorer, fromAddress, toAddress, valueWei, data = '0x', getPrivateKey } = params;

    // Fetch the nonce first so we can pass it to estimateGas (the nonce can
    // affect the estimate for contracts whose execution depends on account
    // state). Gas estimation may fail when the sender lacks sufficient funds;
    // in that case we fall back to the intrinsic gas for a simple transfer
    // and flag every fee tier as insufficient.
    const networkNonce = BigInt((await explorer.getNonce(fromAddress)).nonce);
    const networkInfo = NETWORKS_INFO[explorer.network];
    if (!networkInfo.chainId) {
      throw new UnsupportedOperationError(
        `Network '${explorer.network}' does not have a configured chain ID.`,
      );
    }
    const chainId = BigInt(networkInfo.chainId);
    const cachedNonce = explorer.global.evmNonceCache.get(networkInfo.chainId, fromAddress);
    const nonce =
      cachedNonce !== undefined && cachedNonce > networkNonce ? cachedNonce : networkNonce;

    const [gasEstimateResult, feeRateResult, balanceResult] = await Promise.all([
      explorer
        .estimateGas({
          addressFrom: fromAddress,
          addressTo: toAddress,
          nonce: nonce.toString(),
          amount: valueWei.toString(),
          data: data !== '0x' ? data : undefined,
        })
        .catch(() => null),
      explorer.getFeeRate(),
      explorer.getAddressBalance(fromAddress),
    ]);

    const gasEstimationFailed = gasEstimateResult === null;
    const gasLimit = gasEstimationFailed
      ? fallbackGasFromCalldata(data)
      : BigInt(gasEstimateResult.estimatedGas);
    const balanceWei = balanceResult.confirmed.min();

    const feeRates = parseApiFeeTiers(
      feeRateResult,
      gasLimit,
      valueWei,
      balanceWei,
      gasEstimationFailed,
    );

    return new EvmTransaction({
      explorer,
      fromAddress,
      toAddress,
      valueWei,
      data,
      nonce,
      gasLimit,
      chainId,
      balanceWei,
      feeRates,
      getPrivateKey,
    });
  }
}

/** Converts the fee rate response to our EvmRecommendedFees type. */
function parseApiFeeTiers(
  apiResponse: EvmFeeRateResponse,
  gasLimit: bigint,
  valueWei: bigint,
  balanceWei: bigint,
  gasEstimationFailed: boolean,
): EvmRecommendedFees {
  return {
    low: gradeToFee(apiResponse.low, gasLimit, valueWei, balanceWei, gasEstimationFailed),
    normal: gradeToFee(apiResponse.normal, gasLimit, valueWei, balanceWei, gasEstimationFailed),
    high: gradeToFee(apiResponse.high, gasLimit, valueWei, balanceWei, gasEstimationFailed),
    maximum: gradeToFee(apiResponse.maximum, gasLimit, valueWei, balanceWei, gasEstimationFailed),
  };
}
