import {Api} from 'chaingate-client'
import {Address} from '../Address'
import {CurrencyInfo} from './CurrencyInfo'
import {CurrencyParams} from './CurrencyParams'
import {CurrencyAmount} from './CurrencyAmount'
import {CurrencyPreparedTransaction} from './CurrencyPreparedTransaction'

export abstract class Currency{
    protected readonly api: Api
    public readonly currencyInfo: CurrencyInfo
    protected currencyParams: CurrencyParams

    protected constructor(currencyInfo: CurrencyInfo, api: Api, currencyParams: CurrencyParams) {
        this.currencyInfo = currencyInfo
        this.api = api
        this.currencyParams = currencyParams
    }

    abstract amount(amountStr: string, unit: unknown): Promise<CurrencyAmount>

    abstract getAddress(): Promise<string>

    abstract getBalance(address?: string): Promise<{confirmed: CurrencyAmount, unconfirmed: CurrencyAmount}>

    abstract createTransfer(toAddress: Address, amount: CurrencyAmount): Promise<CurrencyPreparedTransaction>
}
