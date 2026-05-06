import type { EvmRpcExplorer, RpcFeeData } from './EvmRpcExplorer';
import { signEip1559Transaction, signLegacyTransaction } from '../../utils/evmTx';
import { fallbackGasFromCalldata } from '../../utils/evmGasFallback';
import { BaseEvmTransaction } from '../EvmConnector/BaseEvmTransaction';
import type { SignableTxParams } from '../EvmConnector/BaseEvmTransaction';
import { BroadcastedEvmRpcTransaction } from './BroadcastedEvmRpcTransaction';

/** Fee parameters in wei for an EVM RPC transaction. */
export interface EvmRpcFee {
  /** Max fee per gas in wei (EIP-1559) or gas price in wei (legacy). */
  maxFeePerGas: bigint;
  /** Max priority fee per gas in wei (EIP-1559 only, ignored for legacy). */
  maxPriorityFeePerGas: bigint;
  /** Gas limit override. When omitted the auto-estimated value is kept. */
  gasLimit?: bigint;
}

/**
 * An unsigned EVM transaction prepared by {@link EvmRpcConnector.transfer}.
 *
 * @example
 * ```ts
 * const network = cg.networks.evmRpc({ rpcUrl: '...', chainId: 56, name: 'BSC', symbol: 'BNB' });
 * const conn = cg.connect(network, wallet);
 * const tx = await conn.transfer(network.amount('0.1'), '0xRecipient...');
 *
 * // Inspect the current fee
 * const fee = tx.currentFee();
 *
 * // Override with a custom fee and optional gas limit
 * tx.setFee({ maxFeePerGas: 5_000_000_000n, maxPriorityFeePerGas: 1_000_000_000n, gasLimit: 50_000n });
 *
 * // Sign and broadcast
 * const broadcasted = await tx.signAndBroadcast();
 * ```
 */
export class EvmRpcTransaction extends BaseEvmTransaction<BroadcastedEvmRpcTransaction> {
  private readonly explorer: EvmRpcExplorer;
  private readonly supportsEip1559: boolean;

  /** @internal */
  constructor(params: {
    explorer: EvmRpcExplorer;
    fromAddress: string;
    toAddress: string;
    valueWei: bigint;
    data: string;
    nonce: bigint;
    gasLimit: bigint;
    chainId: bigint;
    balanceWei: bigint;
    feeData: RpcFeeData;
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
        maxFeePerGas: params.feeData.maxFeePerGas ?? params.feeData.gasPrice,
        maxPriorityFeePerGas: params.feeData.maxPriorityFeePerGas ?? 0n,
      },
    });
    this.explorer = params.explorer;
    this.supportsEip1559 = params.feeData.supportsEip1559;
  }

  /**
   * Returns the current fee parameters that will be used for signing.
   *
   * For EIP-1559 chains both `maxFeePerGas` and `maxPriorityFeePerGas` are
   * meaningful. For legacy chains `maxFeePerGas` represents the gas price and
   * `maxPriorityFeePerGas` is `0n`.
   */
  public currentFee(): Readonly<EvmRpcFee> {
    return { ...this._currentFee };
  }

  /**
   * Overrides the fee for this transaction.
   *
   * @throws {@link TransactionAlreadySentError} if the transaction has already been sent.
   */
  public setFee(fee: EvmRpcFee): void {
    this.applyFee(fee);
  }

  protected override signTransaction(privateKey: Uint8Array, params: SignableTxParams): string {
    if (this.supportsEip1559) {
      return signEip1559Transaction(params, privateKey);
    }
    return signLegacyTransaction(
      {
        chainId: params.chainId,
        nonce: params.nonce,
        gasPrice: params.maxFeePerGas,
        gasLimit: params.gasLimit,
        to: params.to,
        value: params.value,
        data: params.data,
      },
      privateKey,
    );
  }

  protected override async broadcast(signedRaw: string): Promise<string> {
    return this.explorer.sendRawTransaction(signedRaw);
  }

  protected override recordNonceUsed(): void {
    this.explorer.nonceCache.recordUsed(this.explorer.chainId, this.fromAddress, this.nonce);
  }

  protected override buildBroadcasted(transactionId: string): BroadcastedEvmRpcTransaction {
    return new BroadcastedEvmRpcTransaction(transactionId, this.explorer);
  }

  /**
   * Fetches all required on-chain data (nonce, gas, fees, balance) and
   * constructs the transaction.
   *
   * @internal — used by {@link EvmRpcConnector.transfer}.
   */
  static async create(params: {
    explorer: EvmRpcExplorer;
    fromAddress: string;
    toAddress: string;
    valueWei: bigint;
    data?: string;
    getPrivateKey: () => Promise<Uint8Array>;
  }): Promise<EvmRpcTransaction> {
    const { explorer, fromAddress, toAddress, valueWei, data = '0x', getPrivateKey } = params;

    // Fetch the nonce first so we can pass it to estimateGas (the nonce can
    // affect the estimate for contracts whose execution depends on account
    // state). Take the max with the locally cached nonce so consecutive sends
    // from the same address don't reuse a nonce when the network hasn't yet
    // observed the previous broadcast.
    const networkNonce = await explorer.getNonce(fromAddress);
    const cachedNonce = explorer.nonceCache.get(explorer.chainId, fromAddress);
    const nonce =
      cachedNonce !== undefined && cachedNonce > networkNonce ? cachedNonce : networkNonce;

    const estimateParams: {
      from: string;
      to: string;
      value: bigint;
      data?: string;
      nonce: bigint;
    } = {
      from: fromAddress,
      to: toAddress,
      value: valueWei,
      nonce,
    };
    if (data !== '0x') {
      estimateParams.data = data;
    }

    const [gasEstimate, feeData, balance] = await Promise.all([
      explorer.estimateGas(estimateParams).catch(() => null),
      explorer.getFeeData(),
      explorer.getBalance(fromAddress),
    ]);

    const gasLimit = gasEstimate ?? fallbackGasFromCalldata(data);

    return new EvmRpcTransaction({
      explorer,
      fromAddress,
      toAddress,
      valueWei,
      data,
      nonce,
      gasLimit,
      chainId: BigInt(explorer.chainId),
      balanceWei: balance,
      feeData,
      getPrivateKey,
    });
  }
}
