import type { EvmRpcExplorer, RpcFeeData } from './EvmRpcExplorer';
import type { Eip1559TxParams, LegacyTxParams } from '../../utils/evmTx';
import { signEip1559Transaction, signLegacyTransaction } from '../../utils/evmTx';
import { NotEnoughFundsError, TransactionAlreadySentError } from '../../errors';
import { BroadcastedEvmRpcTransaction } from './BroadcastedEvmRpcTransaction';

/** Intrinsic gas for a simple ETH value transfer (no calldata). */
const SIMPLE_TRANSFER_GAS = 21_000n;

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
 * Automatically selects EIP-1559 (type-2) or legacy (type-0) signing based on
 * the chain's capabilities detected via `eth_maxPriorityFeePerGas`.
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
export class EvmRpcTransaction {
  private readonly explorer: EvmRpcExplorer;
  private readonly fromAddress: string;
  private readonly toAddress: string;
  private readonly valueWei: bigint;
  private readonly data: string;
  private readonly nonce: bigint;
  private gasLimit: bigint;
  private readonly chainId: bigint;
  private readonly balanceWei: bigint;
  private readonly supportsEip1559: boolean;
  private readonly getPrivateKey: () => Promise<Uint8Array>;

  private _currentFee: EvmRpcFee;
  private sent = false;

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
    this.explorer = params.explorer;
    this.fromAddress = params.fromAddress;
    this.toAddress = params.toAddress;
    this.valueWei = params.valueWei;
    this.data = params.data;
    this.nonce = params.nonce;
    this.gasLimit = params.gasLimit;
    this.chainId = params.chainId;
    this.balanceWei = params.balanceWei;
    this.supportsEip1559 = params.feeData.supportsEip1559;
    this.getPrivateKey = params.getPrivateKey;

    this._currentFee = {
      maxFeePerGas: params.feeData.maxFeePerGas ?? params.feeData.gasPrice,
      maxPriorityFeePerGas: params.feeData.maxPriorityFeePerGas ?? 0n,
    };
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
   * Returns whether the wallet has enough funds to cover the transfer plus fee.
   */
  public enoughFunds(): boolean {
    const totalCost = this.valueWei + this._currentFee.maxFeePerGas * this.gasLimit;
    return this.balanceWei >= totalCost;
  }

  /**
   * Overrides the fee for this transaction.
   *
   * Pass an object with `maxFeePerGas`, `maxPriorityFeePerGas` (in wei),
   * and an optional `gasLimit` override.
   *
   * @throws {@link TransactionAlreadySentError} if the transaction has already been sent.
   */
  public setFee(feeParams: EvmRpcFee): void {
    if (this.sent) {
      throw new TransactionAlreadySentError();
    }
    this._currentFee = {
      maxFeePerGas: feeParams.maxFeePerGas,
      maxPriorityFeePerGas: feeParams.maxPriorityFeePerGas,
    };
    if (feeParams.gasLimit !== undefined) {
      this.gasLimit = feeParams.gasLimit;
    }
  }

  /**
   * Signs the transaction and broadcasts it to the network via JSON-RPC.
   *
   * @returns A {@link BroadcastedEvmRpcTransaction} that can be used to track confirmation.
   * @throws {@link TransactionAlreadySentError} if the transaction has already been sent.
   * @throws {@link NotEnoughFundsError} if the wallet does not have enough funds.
   */
  public async signAndBroadcast(): Promise<BroadcastedEvmRpcTransaction> {
    if (this.sent) {
      throw new TransactionAlreadySentError();
    }
    if (!this.enoughFunds()) {
      throw new NotEnoughFundsError();
    }

    const privateKey = await this.getPrivateKey();
    let signedRaw: string;

    if (this.supportsEip1559) {
      const txParams: Eip1559TxParams = {
        chainId: this.chainId,
        nonce: this.nonce,
        maxPriorityFeePerGas: this._currentFee.maxPriorityFeePerGas,
        maxFeePerGas: this._currentFee.maxFeePerGas,
        gasLimit: this.gasLimit,
        to: this.toAddress,
        value: this.valueWei,
        data: this.data,
      };
      signedRaw = signEip1559Transaction(txParams, privateKey);
    } else {
      const txParams: LegacyTxParams = {
        chainId: this.chainId,
        nonce: this.nonce,
        gasPrice: this._currentFee.maxFeePerGas,
        gasLimit: this.gasLimit,
        to: this.toAddress,
        value: this.valueWei,
        data: this.data,
      };
      signedRaw = signLegacyTransaction(txParams, privateKey);
    }

    // Zero out the private key after signing.
    privateKey.fill(0);

    const txHash = await this.explorer.sendRawTransaction(signedRaw);
    this.sent = true;

    return new BroadcastedEvmRpcTransaction(txHash, this.explorer);
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

    // Fetch nonce, gas estimate, fee data, and balance in parallel.
    const estimateParams: { from: string; to: string; value: bigint; data?: string } = {
      from: fromAddress,
      to: toAddress,
      value: valueWei,
    };
    if (data !== '0x') {
      estimateParams.data = data;
    }

    const [nonce, gasEstimate, feeData, balance] = await Promise.all([
      explorer.getTransactionCount(fromAddress),
      explorer.estimateGas(estimateParams).catch(() => null),
      explorer.getFeeData(),
      explorer.getBalance(fromAddress),
    ]);

    const gasLimit = gasEstimate ?? SIMPLE_TRANSFER_GAS;

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
