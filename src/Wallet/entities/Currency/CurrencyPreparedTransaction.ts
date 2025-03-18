import {Api} from 'chaingate-client'
import {CurrencyProviders} from './CurrencyProviders'
import {CurrencyInfo} from './CurrencyInfo'
import {Address} from '../Address'
import {CurrencyAmount} from './CurrencyAmount'
import {FeeLevel} from './FeeLevel'
import {CurrencyFee} from './CurrencyFee'
import {ConfirmedTransaction} from './ConfirmedTransaction'

export abstract class CurrencyPreparedTransaction {
    protected readonly api: Api
    protected readonly currencyProviders: CurrencyProviders
    protected readonly currencyInfo: CurrencyInfo
    public readonly fromAddress
    public readonly toAddress
    public readonly amount

    protected constructor(api: Api, currencyProviders: CurrencyProviders, currencyInfo: CurrencyInfo, fromAddress: Address, toAddress: Address, amount: CurrencyAmount) {
        this.api = api
        this.currencyProviders = currencyProviders
        this.currencyInfo = currencyInfo
        this.fromAddress = fromAddress
        this.toAddress = toAddress
        this.amount = amount
    }

    protected abstract buildSuggestedFees(): Promise<Record<FeeLevel, CurrencyFee>>

    protected _suggestedFees : Record<FeeLevel, CurrencyFee>
    public async getSuggestedFees(): Promise<Record<FeeLevel, CurrencyFee>> {
        if(this._suggestedFees) return this._suggestedFees
        else{
            this._suggestedFees = await this.buildSuggestedFees()
            return this._suggestedFees
        }
    }

    abstract broadcast(fee: FeeLevel | unknown): Promise<ConfirmedTransaction>;
    abstract fee(...args: unknown[]): Promise<CurrencyFee>
}
