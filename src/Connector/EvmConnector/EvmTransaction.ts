import Decimal from 'decimal.js';
import type { EvmExplorer } from '../../Explorer/EvmExplorer';
import type { EvmFeeRateResponse, EvmFeeGradeSchema } from '../../Client';
import type { Eip1559TxParams } from '../../utils/evmTx';
import { signEip1559Transaction } from '../../utils/evmTx';
import { NETWORKS_INFO } from '../../ChainGate/networks';
import {
  NotEnoughFundsError,
  TransactionAlreadySentError,
  UnsupportedOperationError,
} from '../../errors';
import { BroadcastedEvmTransaction } from './BroadcastedEvmTransaction';

/** Fee tier names returned by the API. */
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
}

/** All recommended fee tiers. */
export interface EvmRecommendedFees {
  low: EvmRecommendedFee;
  normal: EvmRecommendedFee;
  high: EvmRecommendedFee;
  maximum: EvmRecommendedFee;
}

/** Intrinsic gas for a simple ETH value transfer (no calldata). */
const SIMPLE_TRANSFER_GAS = '21000';

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
  insufficientFunds: boolean,
): EvmRecommendedFee {
  const maxFeeGwei = grade.maxFeePerGasGwei ?? grade.gasPriceGwei ?? '0';
  const tipGwei = grade.maxPriorityFeePerGasGwei ?? '0';
  const maxFeePerGas = gweiToWei(maxFeeGwei);
  const maxPriorityFeePerGas = gweiToWei(tipGwei);
  const totalCost = valueWei + maxFeePerGas * gasLimit;
  return {
    maxFeePerGas,
    maxPriorityFeePerGas,
    estimatedConfirmationSecs: grade.confirmationTimeSecs,
    enoughFunds: !insufficientFunds && balanceWei >= totalCost,
  };
}

/**
 * An unsigned EVM transaction prepared by {@link EvmConnector.transfer}.
 *
 * The transaction is created with "normal" recommended fees. Before sending,
 * you can inspect or change the fee:
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
 * tx.setFee('high');
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
export class EvmTransaction {
  private readonly explorer: EvmExplorer;
  private readonly fromAddress: string;
  private readonly toAddress: string;
  private readonly valueWei: bigint;
  private readonly data: string;
  private readonly nonce: bigint;
  private gasLimit: bigint;
  private readonly chainId: bigint;
  private readonly balanceWei: bigint;
  private readonly feeRates: EvmRecommendedFees;
  private readonly getPrivateKey: () => Promise<Uint8Array>;

  private currentFee: EvmFee;
  private sent = false;

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
    this.explorer = params.explorer;
    this.fromAddress = params.fromAddress;
    this.toAddress = params.toAddress;
    this.valueWei = params.valueWei;
    this.data = params.data;
    this.nonce = params.nonce;
    this.gasLimit = params.gasLimit;
    this.chainId = params.chainId;
    this.balanceWei = params.balanceWei;
    this.feeRates = params.feeRates;
    this.getPrivateKey = params.getPrivateKey;

    // Default to "normal" recommended fee.
    this.currentFee = {
      maxFeePerGas: params.feeRates.normal.maxFeePerGas,
      maxPriorityFeePerGas: params.feeRates.normal.maxPriorityFeePerGas,
    };
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
   * Returns whether the wallet has enough funds to cover the transfer plus fee
   * at the current fee and gas limit.
   */
  public enoughFunds(): boolean {
    const totalCost = this.valueWei + this.currentFee.maxFeePerGas * this.gasLimit;
    return this.balanceWei >= totalCost;
  }

  /**
   * Sets the fee for this transaction.
   *
   * Pass a tier name (`'low'`, `'normal'`, `'high'`, `'maximum'`) to use a
   * recommended fee, or pass an object with manual `maxFeePerGas`,
   * `maxPriorityFeePerGas` (in wei), and an optional `gasLimit` override.
   *
   * @throws {@link TransactionAlreadySentError} if the transaction has already been sent.
   */
  public setFee(feeOrTier: EvmFeeTier | EvmFee): void {
    if (this.sent) {
      throw new TransactionAlreadySentError();
    }
    if (typeof feeOrTier === 'string') {
      const tier = this.feeRates[feeOrTier];
      this.currentFee = {
        maxFeePerGas: tier.maxFeePerGas,
        maxPriorityFeePerGas: tier.maxPriorityFeePerGas,
      };
    } else {
      this.currentFee = {
        maxFeePerGas: feeOrTier.maxFeePerGas,
        maxPriorityFeePerGas: feeOrTier.maxPriorityFeePerGas,
      };
      if (feeOrTier.gasLimit !== undefined) {
        this.gasLimit = feeOrTier.gasLimit;
      }
    }
  }

  /**
   * Signs the transaction with the wallet's private key and broadcasts it to the network.
   *
   * @returns A {@link BroadcastedEvmTransaction} that can be used to track confirmation.
   * @throws {@link TransactionAlreadySentError} if the transaction has already been sent.
   * @throws {@link NotEnoughFundsError} if the wallet does not have enough funds.
   * @throws {@link UnsupportedOperationError} if the wallet is view-only.
   */
  public async signAndBroadcast(): Promise<BroadcastedEvmTransaction> {
    if (this.sent) {
      throw new TransactionAlreadySentError();
    }
    if (!this.enoughFunds()) {
      throw new NotEnoughFundsError();
    }

    const privateKey = await this.getPrivateKey();

    const txParams: Eip1559TxParams = {
      chainId: this.chainId,
      nonce: this.nonce,
      maxPriorityFeePerGas: this.currentFee.maxPriorityFeePerGas,
      maxFeePerGas: this.currentFee.maxFeePerGas,
      gasLimit: this.gasLimit,
      to: this.toAddress,
      value: this.valueWei,
      data: this.data,
    };

    const signedRaw = signEip1559Transaction(txParams, privateKey);

    // Zero out the private key after signing.
    privateKey.fill(0);

    const { transactionId } = await this.explorer.broadcastTransaction(signedRaw);

    this.sent = true;

    return new BroadcastedEvmTransaction(transactionId, this.explorer);
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

    // Fetch nonce, gas estimate, fee rates, and balance in parallel.
    // Gas estimation may fail when the sender lacks sufficient funds; in that
    // case we fall back to the intrinsic gas for a simple transfer and flag
    // every fee tier as insufficient.
    const [txCountResult, gasEstimateResult, feeRateResult, balanceResult] = await Promise.all([
      explorer.getAddressTransactionCount(fromAddress),
      explorer
        .estimateGas({
          addressFrom: fromAddress,
          addressTo: toAddress,
          nonce: '0', // nonce doesn't affect gas estimate
          amount: valueWei.toString(),
          data: data !== '0x' ? data : undefined,
        })
        .catch(() => null),
      explorer.getFeeRate(),
      explorer.getAddressBalance(fromAddress),
    ]);

    const nonce = BigInt(txCountResult.transactionCount);
    const insufficientFunds = gasEstimateResult === null;
    const gasLimit = insufficientFunds
      ? BigInt(SIMPLE_TRANSFER_GAS)
      : BigInt(gasEstimateResult.estimatedGas);
    const balanceWei = balanceResult.confirmed.min();

    const networkInfo = NETWORKS_INFO[explorer.network];
    if (!networkInfo.chainId) {
      throw new UnsupportedOperationError(
        `Network '${explorer.network}' does not have a configured chain ID.`,
      );
    }
    const chainId = BigInt(networkInfo.chainId);

    const feeRates = parseApiFeeTiers(
      feeRateResult,
      gasLimit,
      valueWei,
      balanceWei,
      insufficientFunds,
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

/** Converts the API fee rate response to our EvmRecommendedFees type. */
function parseApiFeeTiers(
  apiResponse: EvmFeeRateResponse,
  gasLimit: bigint,
  valueWei: bigint,
  balanceWei: bigint,
  insufficientFunds: boolean,
): EvmRecommendedFees {
  return {
    low: gradeToFee(apiResponse.low, gasLimit, valueWei, balanceWei, insufficientFunds),
    normal: gradeToFee(apiResponse.normal, gasLimit, valueWei, balanceWei, insufficientFunds),
    high: gradeToFee(apiResponse.high, gasLimit, valueWei, balanceWei, insufficientFunds),
    maximum: gradeToFee(apiResponse.maximum, gasLimit, valueWei, balanceWei, insufficientFunds),
  };
}
