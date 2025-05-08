import {ChainGateClient} from 'chaingate-client'
import {Address} from '../Address'
import {CurrencyInfo} from './CurrencyInfo'
import {CurrencyProviders} from './CurrencyProviders'
import {CurrencyAmount} from './CurrencyAmount'
import {CurrencyPreparedTransaction} from './CurrencyPreparedTransaction'
import {FiatCurrencies, MarketsProvider} from '../../../MarketsProvider'
import Decimal from 'decimal.js'

export abstract class Currency{
    public readonly currencyInfo: CurrencyInfo
    protected currencyProviders: CurrencyProviders
    protected client: ChainGateClient

    protected constructor(currencyInfo: CurrencyInfo, client: ChainGateClient, currencyProviders: CurrencyProviders) {
        this.currencyInfo = currencyInfo
        this.currencyProviders = currencyProviders
        this.client = client
    }

    abstract amount(amountStr: string, unit: unknown): Promise<CurrencyAmount>

    async amountFiat(amountStr: string, fiatCurrency: typeof FiatCurrencies[number]) {
        const markets = await MarketsProvider.getMarketData(this.client)

        let amountFiat: Decimal
        try {
            amountFiat = new Decimal(amountStr)
        } catch {
            throw new Error(`Invalid amount string: ${amountStr}`)
        }

        // Calculate total in usd
        const fiatData = markets.fiat.find(t => t.symbol === fiatCurrency)
        if (!fiatData) throw new Error(`Fiat currency ${fiatCurrency} not found`)
        const fiatRateUsd = new Decimal(fiatData.rateUsd)
        const totalUsd = amountFiat.mul(fiatRateUsd)

        //Calculate total in crypto
        const cryptoData = markets.crypto.find(t => t.id === this.currencyInfo.id)
        if (!cryptoData) throw new Error('Crypto rate not found')
        const cryptoRateUsd = new Decimal(cryptoData.rateUsd)
        if (cryptoRateUsd.eq(0)) return new CurrencyAmount(this.currencyInfo, new Decimal(0), this.client)
        const totalCrypto = totalUsd.div(cryptoRateUsd)

        return new CurrencyAmount(this.currencyInfo, totalCrypto, this.client)
    }

    async getUsdRate(){
        const markets = await MarketsProvider.getMarketData(this.client)
        return new Decimal(markets.crypto.find(t => t.rateUsd).rateUsd)
    }

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
