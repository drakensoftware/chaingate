import Decimal from 'decimal.js'
import {CurrencyInfo} from './CurrencyInfo'
import {ChainGateClient} from 'chaingate-client'
import {FiatCurrencies, MarketsProvider} from '../../../MarketsProvider'

export class CurrencyAmount {
    private readonly currencyInfo: CurrencyInfo
    private readonly client: ChainGateClient
    readonly baseAmount: Decimal

    get baseSymbol(){
        return this.currencyInfo.symbol
    }

    get minimalUnitAmount(){
        return this.baseAmount.mul( (new Decimal(10)).pow(this.currencyInfo.decimals))
    }

    get minimalUnitSymbol() {
        return this.currencyInfo.minimalUnitSymbol
    }

    get str(){
        if(this.baseAmount.decimalPlaces() > 5) return `${this.baseAmount.toFixed(5)}... ${this.baseSymbol}`
        return `${this.baseAmount.toString()} ${this.baseSymbol}`
    }

    readonly decimals: number

    constructor(currencyInfo: CurrencyInfo, baseAmount: Decimal, client: ChainGateClient){
        this.currencyInfo = currencyInfo
        this.baseAmount = baseAmount
        this.decimals = currencyInfo.decimals
        this.client = client
    }

    plus(currencyAmount: CurrencyAmount){
        if(currencyAmount.currencyInfo.id != currencyAmount.currencyInfo.id
        ) throw new Error('Invalid amount')

        return new CurrencyAmount(this.currencyInfo, this.baseAmount.plus(currencyAmount.baseAmount), this.client)
    }

    minus(currencyAmount: CurrencyAmount){
        if(currencyAmount.currencyInfo.id != currencyAmount.currencyInfo.id
        ) throw new Error('Invalid amount')

        return new CurrencyAmount(this.currencyInfo, this.baseAmount.minus(currencyAmount.baseAmount), this.client)
    }

    div(currencyAmount: CurrencyAmount){
        if(currencyAmount.currencyInfo.id != currencyAmount.currencyInfo.id
        ) throw new Error('Invalid amount')

        return new CurrencyAmount(this.currencyInfo, this.baseAmount.div(currencyAmount.baseAmount), this.client)
    }

    mul(currencyAmount: CurrencyAmount){
        if(currencyAmount.currencyInfo.id != currencyAmount.currencyInfo.id
        ) throw new Error('Invalid amount')

        return new CurrencyAmount(this.currencyInfo, this.baseAmount.mul(currencyAmount.baseAmount), this.client)
    }

    async toFiat(fiatCurrency: typeof FiatCurrencies[number]) {
        const markets = await MarketsProvider.getMarketData(this.client)

        const cryptoData = markets.crypto.find(t => t.id === this.currencyInfo.nativeTokenId)
        if (!cryptoData) throw new Error('Crypto rate not found')
        const cryptoRateUsd = new Decimal(cryptoData.rateUsd)
        const totalUsd = cryptoRateUsd.mul(this.baseAmount)

        const fiatData = markets.fiat.find(t => t.symbol === fiatCurrency)
        if (!fiatData) throw new Error(`Fiat currency ${fiatCurrency} not found`)
        const fiatRateUsd = new Decimal(fiatData.rateUsd)

        return totalUsd.div(fiatRateUsd)
    }
}
