import {ChainGateClient} from 'chaingate-client'
import {PrivateKeySource} from './Keys'
import {DefaultCurrencies} from './Currencies/Currencies'

export abstract class Wallet {
    public readonly apiClient: ChainGateClient
    protected privateKeySource: PrivateKeySource

    protected _currencies: DefaultCurrencies
    public get currencies(){
        return this._currencies
    }

    protected constructor(chainGateClient: ChainGateClient, privateKeySource: PrivateKeySource, currencies: DefaultCurrencies) {
        this.apiClient = chainGateClient
        this.privateKeySource = privateKeySource
        this._currencies = currencies
    }

    get isEncrypted(): boolean {
        return this.privateKeySource.isEncrypted
    }

    public async encrypt(password: string){
        await this.privateKeySource.encrypt(password)
    }

    async runUnencrypted<T>(password: string, fn: () => Promise<T>): Promise<T> {
        return await this.privateKeySource.runUnencrypted(password, fn)
    }

    async getAllBalances(){
        return await Promise.all(
            this.currencies.all.map(async (currency) => ({
                currency: currency.currencyInfo,
                balance: await currency.getBalance()
            }))
        )
    }
}
