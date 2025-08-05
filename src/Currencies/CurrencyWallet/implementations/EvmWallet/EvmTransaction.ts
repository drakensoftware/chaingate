import { ethers, SigningKey, type TransactionRequest } from 'ethers'
import { Address } from '../../../../Wallet/entities/Address'
import { FeeLevel } from '../../FeeLevel'
import { Transaction } from '../../Transaction'
import { EvmFee, type FeeType, type LegacyTxFee, type Eip1559TxFee } from './EvmFee'
import { PrivateKeyProvider } from '../../Transports'
import { EvmBroadcastedTransaction } from './EvmBroadcastedTransaction'
import { NotEnoughFundsError } from '../../errors'
import type { EvmCurrencyInfo } from '../../../CurrencyInfo'
import type { CurrencyAmount } from '../../../CurrencyUtils'
import { EvmCurrencyUtils } from '../../../CurrencyUtils/abstract/EvmCurrencyUtils'
import type { Eip1559Fee, EvmPossibleFees, Fee } from '../../../../Client'

export class EvmTransaction<CI extends EvmCurrencyInfo> extends Transaction<CI> {
    declare protected _suggestedFees: Record<FeeLevel, EvmFee<CI>>

    private readonly utils: EvmCurrencyUtils<CI>
    private readonly privateKeyProvider: PrivateKeyProvider
    public readonly data: string

    constructor(
        utils: EvmCurrencyUtils<CI>,
        fromAddress: Address,
        toAddress: Address,
        amount: CurrencyAmount<CI>,
        data: string,
        privateKeyProvider: PrivateKeyProvider,
    ) {
        super(fromAddress, toAddress, amount)
        this.utils = utils
        this.data = data
        this.privateKeyProvider = privateKeyProvider
    }

    async broadcast(fee: FeeLevel | EvmFee<CI>): Promise<EvmBroadcastedTransaction<CI>> {
        // Convert fee-level shortcut into concrete fee description when required
        if (typeof fee === 'string') {
            const suggested = this._suggestedFees ?? (await this.buildSuggestedFees())
            fee = suggested[fee]
        }

        if (!fee.enoughFunds || !fee.feeAmount) {
            throw new NotEnoughFundsError()
        }

        const signer = new ethers.Wallet(new SigningKey((await this.privateKeyProvider()).raw))
        const nonce = await this.utils.addressTransactionCount(this.fromAddress)
        const gasLimit = await this.estimateGasLimit(nonce)

        const txBase = this.createBaseTransaction(nonce, gasLimit)
        const tx = this.createTransactionWithFees(txBase, fee)

        const txSigned = await signer.signTransaction(tx)
        const broadcastedTx = await this.utils.broadcastTransaction(txSigned)

        return new EvmBroadcastedTransaction(broadcastedTx.transactionId)
    }

    private createBaseTransaction(nonce: number, gasLimit: bigint): TransactionRequest {
        return {
            from: this.fromAddress as `0x${string}`,
            to: this.toAddress as `0x${string}`,
            value: ethers.toBigInt(this.amount.minimalUnitAmount.toString()),
            data: this.data ?? '0x',
            nonce,
            gasLimit,
            chainId: this.utils.currencyInfo.chainId,
        }
    }

    private async estimateGasLimit(nonce: number): Promise<bigint> {
        try {
            const limit = await this.utils.estimateGas(
                this.fromAddress,
                this.toAddress,
                this.amount,
                nonce,
                this.data ?? '0x',
            )
            return BigInt(limit)
        } catch (ex) {
            if (this.isInsufficientAmountError(ex)) {
                throw new NotEnoughFundsError()
            }
            throw ex
        }
    }

    private isInsufficientAmountError(ex: unknown): boolean {
        return (ex as { response?: { data?: string } })?.response?.data === 'Insufficient amount'
    }

    private createTransactionWithFees(
        txBase: TransactionRequest,
        fee: EvmFee<CI>,
    ): TransactionRequest {
        if (fee.gasPrice) {
            return {
                ...txBase,
                gasPrice: ethers.toBigInt(fee.gasPrice.minimalUnitAmount.toString()),
            }
        }

        if (fee.maxFeePerGas && fee.maxPriorityFeePerGas) {
            return {
                ...txBase,
                maxFeePerGas: ethers.toBigInt(fee.maxFeePerGas.minimalUnitAmount.toString()),
                maxPriorityFeePerGas: ethers.toBigInt(
                    fee.maxPriorityFeePerGas.minimalUnitAmount.toString(),
                ),
            }
        }

        throw new Error('Invalid fee structure provided')
    }

    protected async buildSuggestedFees(): Promise<Record<FeeLevel, EvmFee<CI>>> {
        const addressBalance = (await this.utils.addressBalance(this.fromAddress)).confirmed
        const feeRate = await this.utils.getFeeRate()
        const estimatedGas = await this.getEstimatedGas(addressBalance)

        const fees: Partial<Record<FeeLevel, EvmFee<CI>>> = {}
        this.processFeeLevels(feeRate, estimatedGas, addressBalance, fees)

        return fees as Record<FeeLevel, EvmFee<CI>>
    }

    private async getEstimatedGas(addressBalance: CurrencyAmount<CI>): Promise<number | null> {
        if (!addressBalance.baseAmount.gte(this.amount.baseAmount)) {
            return null
        }

        try {
            const nonce = await this.utils.addressTransactionCount(this.fromAddress)
            return await this.utils.estimateGas(
                this.fromAddress,
                this.toAddress,
                this.amount,
                nonce,
                this.data ?? '0x',
            )
        } catch {
            return null
        }
    }

    private processFeeLevels(
        feeRate: EvmPossibleFees,
        estimatedGas: number | null,
        addressBalance: CurrencyAmount<CI>,
        fees: Partial<Record<FeeLevel, EvmFee<CI>>>,
    ): void {
        const levels: FeeLevel[] = ['low', 'normal', 'high', 'maximum']

        for (const level of levels) {
            const entry = feeRate[level]
            const isLegacy = 'gasPrice' in entry

            const { feeAmount, enoughFunds } =
                estimatedGas !== null
                    ? this.calculateFeeAmount(entry, estimatedGas, addressBalance, isLegacy)
                    : { feeAmount: null, enoughFunds: false }

            fees[level] = this.createFeeInstance(entry, isLegacy, enoughFunds, feeAmount)
        }
    }

    private calculateFeeAmount(
        entry: Fee | Eip1559Fee,
        estimatedGas: number,
        addressBalance: CurrencyAmount<CI>,
        isLegacy: boolean,
    ): { feeAmount: CurrencyAmount<CI>; enoughFunds: boolean } {
        const gasPrice = isLegacy ? (entry as Fee).gasPrice : (entry as Eip1559Fee).maxFeePerGas
        const feeBase = this.utils.amount(gasPrice, this.utils.currencyInfo.symbol).baseAmount
        const totalFeeBase = feeBase.mul(estimatedGas)
        const feeAmount = this.utils.amount(totalFeeBase, this.utils.currencyInfo.symbol)

        const enoughFunds = addressBalance.baseAmount.gte(
            this.amount.baseAmount.plus(feeAmount.baseAmount),
        )

        return { feeAmount, enoughFunds }
    }

    private createFeeInstance(
        entry: Fee | Eip1559Fee,
        isLegacy: boolean,
        enoughFunds: boolean,
        feeAmount: CurrencyAmount<CI> | null,
    ): EvmFee<CI> {
        const feeConfig = isLegacy
            ? {
                  gasPrice: this.utils.amount(
                      (entry as Fee).gasPrice,
                      this.utils.currencyInfo.symbol,
                  ),
              }
            : {
                  maxFeePerGas: this.utils.amount(
                      (entry as Eip1559Fee).maxFeePerGas,
                      this.utils.currencyInfo.symbol,
                  ),
                  maxPriorityFeePerGas: this.utils.amount(
                      (entry as Eip1559Fee).maxPriorityFeePerGas,
                      this.utils.currencyInfo.symbol,
                  ),
              }

        return new EvmFee<CI>(
            feeConfig as FeeType<CI>,
            true,
            enoughFunds,
            entry.confirmationTimeSecs,
            feeAmount,
        )
    }

    async fee(fee: FeeType<CI>): Promise<EvmFee<CI>> {
        const addressBalance = (await this.utils.addressBalance(this.fromAddress)).confirmed
        const nonce = await this.utils.addressTransactionCount(this.fromAddress)

        try {
            const estimatedGas = await this.utils.estimateGas(
                this.fromAddress,
                this.toAddress,
                this.amount,
                nonce,
                this.data ?? '0x',
            )

            const { feeAmount, enoughFunds } = this.calculateFeeFromType(
                fee,
                estimatedGas,
                addressBalance,
            )
            return new EvmFee<CI>(fee, true, enoughFunds, null, feeAmount)
        } catch (ex) {
            if (this.isInsufficientAmountError(ex)) {
                return new EvmFee<CI>(fee, true, false, null, null)
            }
            throw ex
        }
    }

    private calculateFeeFromType(
        fee: FeeType<CI>,
        estimatedGas: number,
        addressBalance: CurrencyAmount<CI>,
    ): { feeAmount: CurrencyAmount<CI>; enoughFunds: boolean } {
        const isLegacy = 'gasPrice' in fee
        const feeBase = isLegacy
            ? (fee as LegacyTxFee<CI>).gasPrice.baseAmount
            : (fee as Eip1559TxFee<CI>).maxFeePerGas.baseAmount

        const feeAmount = this.utils.amount(
            feeBase.mul(estimatedGas),
            this.utils.currencyInfo.symbol,
        )

        const enoughFunds = addressBalance.baseAmount.gte(
            this.amount.baseAmount.plus(feeAmount.baseAmount),
        )

        return { feeAmount, enoughFunds }
    }
}
