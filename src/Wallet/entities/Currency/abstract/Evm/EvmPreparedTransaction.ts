import {EvmApi} from 'chaingate-client'
import {ethers, SigningKey, TransactionRequest} from 'ethers'
import Decimal from 'decimal.js'
import {ConsumeFunction} from '../../../../../CGDriver'
import {Address} from '../../../Address'
import {FeeLevel} from '../../FeeLevel'
import {CurrencyPreparedTransaction} from '../../CurrencyPreparedTransaction'
import {EvmFee} from './EvmFee'
import {EvmCurrencyInfo} from './EvmCurrencyInfo'
import {CurrencyProviders, PrivateKeyProvider} from '../../CurrencyProviders'
import {CurrencyAmount} from '../../CurrencyAmount'
import {EvmConfirmedTransaction} from './EvmConfirmedTransaction'
import {EvmPossibleFees} from 'chaingate-client/api'
import {NotEnoughFundsError} from '../../errors'

export class EvmPreparedTransaction extends CurrencyPreparedTransaction{
    declare protected api: EvmApi
    declare protected _suggestedFees: Record<FeeLevel, EvmFee>

    declare currencyInfo: EvmCurrencyInfo

    private readonly privateKeyProvider: PrivateKeyProvider

    readonly data: string

    constructor(
        api: EvmApi,
        currencyProviders: CurrencyProviders,
        currencyInfo: EvmCurrencyInfo,
        fromAddress: Address,
        toAddress: Address,
        amount: CurrencyAmount,
        data: string,
        privateKeyProvider: PrivateKeyProvider
    ){
        super(api, currencyProviders, currencyInfo, fromAddress, toAddress, amount)
        this.data = data
        this.privateKeyProvider = privateKeyProvider
    }

    async broadcast(fee: FeeLevel | EvmFee): Promise<EvmConfirmedTransaction> {
        if(typeof fee === 'string') fee = (this._suggestedFees ?? await this.buildSuggestedFees())[fee] // Param passed is fee level

        if(!fee.enoughFunds || !fee.feeAmount) throw new NotEnoughFundsError()

        const signer = new ethers.Wallet(new SigningKey((await this.privateKeyProvider()).raw))

        const nonce = new Decimal(await ConsumeFunction(
            this.api,
            this.api.addressTransactionCount,
            this.fromAddress
        ))

        let gasLimit
        try{
            gasLimit = new Decimal(await ConsumeFunction(
                this.api,
                this.api.estimateGas,
                this.fromAddress,
                this.toAddress,
                nonce.toString(),
                this.amount.baseAmount.toString(),
                this.data ? this.data.toString() : '0x'
            ))
        }catch (ex){
            if(ex.response?.data == 'Insufficient amount') throw new NotEnoughFundsError()
            throw ex
        }

        const tx: TransactionRequest = {
            from: this.fromAddress,
            to: this.toAddress,
            maxFeePerGas: ethers.toBigInt(fee.maxFeePerGas.minimalUnitAmount.toString()),
            maxPriorityFeePerGas: ethers.toBigInt(fee.maxPriorityFeePerGas.minimalUnitAmount.toString()),
            value: ethers.toBigInt(this.amount.minimalUnitAmount.toString()),
            data: this.data ? this.data.toString() : '0x',
            nonce: nonce.toNumber(),
            gasLimit: ethers.toBigInt(gasLimit.toString()),
            chainId: this.currencyInfo.chainId
        }

        const txSigned = await signer.signTransaction(tx)

        const broadcastedTx = await ConsumeFunction(
            this.api,
            this.api.broadcastTransaction,
            {'transactionRaw': txSigned}
        )

        return new EvmConfirmedTransaction(this.api, broadcastedTx.txId as string)
    }

    protected async buildSuggestedFees(): Promise<Record<FeeLevel, EvmFee>> {
        const addressBalance = new Decimal(
            (await ConsumeFunction(this.api, this.api.addressBalance, this.fromAddress)).confirmed
        )
        const fees: Partial<Record<FeeLevel, EvmFee>> = {}

        if (addressBalance.gte(this.amount.baseAmount)) {
            const nonce = new Decimal(
                await ConsumeFunction(this.api, this.api.addressTransactionCount, this.fromAddress)
            )
            const estimatedGas = new CurrencyAmount(
                this.currencyInfo,
                new Decimal(await ConsumeFunction(
                    this.api,
                    this.api.estimateGas,
                    this.fromAddress,
                    this.toAddress,
                    nonce.toString(),
                    this.amount.baseAmount.toString(),
                    this.data?.toString() ?? '0x'
                ))
            )
            const feeRateResponse = await ConsumeFunction(this.api, this.api.feeRate)
            this.processFeeLevels(feeRateResponse, estimatedGas, addressBalance, fees)
        } else {
            const feeRateResponse = await ConsumeFunction(this.api, this.api.feeRate)
            this.processFeeLevels(feeRateResponse, null, addressBalance, fees)
        }

        return fees as Record<FeeLevel, EvmFee>
    }

    private processFeeLevels(
        feeRateResponse: EvmPossibleFees,
        estimatedGas: CurrencyAmount | null,
        addressBalance: Decimal,
        fees: Partial<Record<FeeLevel, EvmFee>>
    ) {
        const levels: FeeLevel[] = ['low', 'normal', 'high', 'maximum']

        for (const level of levels) {
            const { maxFeePerGas, maxPriorityFeePerGas, confirmationTimeSecs } = feeRateResponse[level]
            const maxFee = new CurrencyAmount(this.currencyInfo, new Decimal(maxFeePerGas))
            const maxPriorityFee = new CurrencyAmount(this.currencyInfo, new Decimal(maxPriorityFeePerGas))

            let amountFee: CurrencyAmount | null = null
            let isBalanceSufficient = false

            if (estimatedGas) {
                amountFee = estimatedGas.mul(maxFee)
                isBalanceSufficient = addressBalance.gte(amountFee.plus(this.amount).baseAmount)
            }

            fees[level] = new EvmFee(
                maxFee,
                maxPriorityFee,
                true,
                isBalanceSufficient,
                confirmationTimeSecs,
                amountFee
            )
        }
    }

    async fee(maxFeePerGas: string | CurrencyAmount, maxPriorityFeePerGas: string | CurrencyAmount): Promise<EvmFee> {
        const addressBalance = new Decimal((await ConsumeFunction(this.api, this.api.addressBalance, this.fromAddress)).confirmed)

        if(typeof maxFeePerGas == 'string') maxFeePerGas = new CurrencyAmount(this.currencyInfo, new Decimal(maxFeePerGas))
        if(typeof maxPriorityFeePerGas == 'string') maxPriorityFeePerGas = new CurrencyAmount(this.currencyInfo, new Decimal(maxPriorityFeePerGas))

        const nonce = new Decimal(await ConsumeFunction(
            this.api,
            this.api.addressTransactionCount,
            this.fromAddress
        ))

        let estimatedGas
        try{
            estimatedGas = new CurrencyAmount( this.currencyInfo, new Decimal(await ConsumeFunction(
                this.api,
                this.api.estimateGas,
                this.fromAddress,
                this.toAddress,
                nonce.toString(),
                this.amount.baseAmount.toString(),
                this.data ? this.data.toString() : '0x'
            )))

            const totalGasFee = maxFeePerGas.mul(estimatedGas)

            return new EvmFee(
                maxFeePerGas,
                maxPriorityFeePerGas,
                true,
                addressBalance.gte(totalGasFee.plus(this.amount).baseAmount),
                null,
                totalGasFee
            )
        }catch (ex){
            if(ex.response?.data == 'Insufficient amount'){
                return new EvmFee(
                    maxFeePerGas,
                    maxPriorityFeePerGas,
                    true,
                    false,
                    null,
                    null
                )
            }
            throw ex
        }
    }


}
