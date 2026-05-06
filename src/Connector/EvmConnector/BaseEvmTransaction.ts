import { NotEnoughFundsError, TransactionAlreadySentError } from '../../errors';

/** Fee parameters in wei. */
export interface BaseEvmFee {
  /** Max fee per gas in wei (EIP-1559) or gas price in wei (legacy). */
  maxFeePerGas: bigint;
  /** Max priority fee per gas in wei (EIP-1559 only, ignored for legacy). */
  maxPriorityFeePerGas: bigint;
  /** Optional gas limit override. When omitted the auto-estimated value is kept. */
  gasLimit?: bigint;
}

/** Normalized parameters passed to {@link BaseEvmTransaction.signTransaction}. */
export interface SignableTxParams {
  chainId: bigint;
  nonce: bigint;
  /** Max fee per gas (EIP-1559) or gas price (legacy). */
  maxFeePerGas: bigint;
  /** Max priority fee per gas. Ignored by legacy signers. */
  maxPriorityFeePerGas: bigint;
  gasLimit: bigint;
  to: string;
  value: bigint;
  data: string;
}

/** Shared base for unsigned EVM transactions. */
export abstract class BaseEvmTransaction<TBroadcasted> {
  protected readonly fromAddress: string;
  protected readonly toAddress: string;
  protected readonly valueWei: bigint;
  protected readonly data: string;
  protected readonly nonce: bigint;
  protected gasLimit: bigint;
  protected readonly chainId: bigint;
  protected readonly balanceWei: bigint;
  protected readonly getPrivateKey: () => Promise<Uint8Array>;

  protected _currentFee: { maxFeePerGas: bigint; maxPriorityFeePerGas: bigint };
  protected sent = false;

  /** @internal */
  protected constructor(params: {
    fromAddress: string;
    toAddress: string;
    valueWei: bigint;
    data: string;
    nonce: bigint;
    gasLimit: bigint;
    chainId: bigint;
    balanceWei: bigint;
    getPrivateKey: () => Promise<Uint8Array>;
    initialFee: { maxFeePerGas: bigint; maxPriorityFeePerGas: bigint };
  }) {
    this.fromAddress = params.fromAddress;
    this.toAddress = params.toAddress;
    this.valueWei = params.valueWei;
    this.data = params.data;
    this.nonce = params.nonce;
    this.gasLimit = params.gasLimit;
    this.chainId = params.chainId;
    this.balanceWei = params.balanceWei;
    this.getPrivateKey = params.getPrivateKey;
    this._currentFee = { ...params.initialFee };
  }

  /** Returns whether the wallet has enough funds for value + fee at the current gas limit. */
  public enoughFunds(): boolean {
    const totalCost = this.valueWei + this._currentFee.maxFeePerGas * this.gasLimit;
    return this.balanceWei >= totalCost;
  }

  /**
   * Applies a fee override to this transaction.
   *
   * @throws {@link TransactionAlreadySentError} if the transaction has already been sent.
   * @internal
   */
  protected applyFee(fee: BaseEvmFee): void {
    if (this.sent) {
      throw new TransactionAlreadySentError();
    }
    this._currentFee = {
      maxFeePerGas: fee.maxFeePerGas,
      maxPriorityFeePerGas: fee.maxPriorityFeePerGas,
    };
    if (fee.gasLimit !== undefined) {
      this.gasLimit = fee.gasLimit;
    }
  }

  /**
   * Signs the transaction with the wallet's private key and broadcasts it.
   *
   * @returns A subclass-specific `Broadcasted*Transaction` that tracks confirmation.
   * @throws {@link TransactionAlreadySentError} if the transaction has already been sent.
   * @throws {@link NotEnoughFundsError} if the wallet does not have enough funds.
   */
  public async signAndBroadcast(): Promise<TBroadcasted> {
    if (this.sent) {
      throw new TransactionAlreadySentError();
    }
    if (!this.enoughFunds()) {
      throw new NotEnoughFundsError();
    }

    const privateKey = await this.getPrivateKey();
    const signedRaw = this.signTransaction(privateKey, {
      chainId: this.chainId,
      nonce: this.nonce,
      maxFeePerGas: this._currentFee.maxFeePerGas,
      maxPriorityFeePerGas: this._currentFee.maxPriorityFeePerGas,
      gasLimit: this.gasLimit,
      to: this.toAddress,
      value: this.valueWei,
      data: this.data,
    });

    // Zero out the private key after signing.
    privateKey.fill(0);

    const transactionId = await this.broadcast(signedRaw);
    this.sent = true;
    this.recordNonceUsed();

    return this.buildBroadcasted(transactionId);
  }

  /** @internal */
  protected abstract signTransaction(privateKey: Uint8Array, params: SignableTxParams): string;

  /** @internal */
  protected abstract broadcast(signedRaw: string): Promise<string>;

  /** @internal */
  protected abstract recordNonceUsed(): void;

  /** @internal */
  protected abstract buildBroadcasted(transactionId: string): TBroadcasted;
}
