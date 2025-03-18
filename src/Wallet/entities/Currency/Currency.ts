import {Api} from 'chaingate-client'
import {Address} from '../Address'
import {CurrencyInfo} from './CurrencyInfo'
import {CurrencyProviders} from './CurrencyProviders'
import {CurrencyAmount} from './CurrencyAmount'
import {CurrencyPreparedTransaction} from './CurrencyPreparedTransaction'

export abstract class Currency{
    protected readonly api: Api
    public readonly currencyInfo: CurrencyInfo
    protected currencyProviders: CurrencyProviders

    protected constructor(currencyInfo: CurrencyInfo, api: Api, currencyProviders: CurrencyProviders) {
        this.currencyInfo = currencyInfo
        this.api = api
        this.currencyProviders = currencyProviders
    }

    abstract amount(amountStr: string, unit: unknown): Promise<CurrencyAmount>

    abstract getAddress(): Promise<string>

    abstract getBalance(address?: string): Promise<{confirmed: CurrencyAmount, unconfirmed: CurrencyAmount}>

    abstract createTransfer(toAddress: Address, amount: CurrencyAmount): Promise<CurrencyPreparedTransaction>

    async getPublicKey(){
        return (await this.currencyProviders.getPublicKeyProvider(this.currencyInfo))()
    }

    async getPrivateKey(){
        return (await this.currencyProviders.getPrivateKeyProvider(this.currencyInfo))()
    }
}
