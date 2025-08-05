import { CurrencyInfo } from '../CurrencyInfo'
import { FiatCurrencies } from '../FiatCurrencies'
import { GlobalMarketsResponse } from '../../Client'
import { TtlCache } from '../../InternalUtils/TtlCache'
import { toDecimal } from '../../InternalUtils/NumberLike'
import Decimal from 'decimal.js'

export class CurrencyAmount<CI extends CurrencyInfo> {
    private readonly currencyInfo: CI
    private readonly markets: TtlCache<GlobalMarketsResponse>
    readonly baseAmount: Decimal

    get baseSymbol() {
        return this.currencyInfo.symbol
    }

    get minimalUnitAmount() {
        return this.baseAmount.mul(toDecimal(10).pow(this.currencyInfo.decimals))
    }

    get minimalUnitSymbol() {
        return this.currencyInfo.minimalUnitSymbol
    }

    get str() {
        if (this.baseAmount.decimalPlaces() > 5)
            return `${this.baseAmount.toFixed(5)}... ${this.baseSymbol}`
        return `${this.baseAmount.toString()} ${this.baseSymbol}`
    }

    readonly decimals: number

    constructor(currencyInfo: CI, baseAmount: Decimal, markets: TtlCache<GlobalMarketsResponse>) {
        this.currencyInfo = currencyInfo
        this.baseAmount = baseAmount
        this.decimals = currencyInfo.decimals
        this.markets = markets
    }

    plus(currencyAmount: CurrencyAmount<CI>) {
        if (currencyAmount.currencyInfo.id != currencyAmount.currencyInfo.id)
            throw new Error('Invalid amount')

        return new CurrencyAmount(
            this.currencyInfo,
            this.baseAmount.plus(currencyAmount.baseAmount),
            this.markets,
        )
    }

    minus(currencyAmount: CurrencyAmount<CI>) {
        if (currencyAmount.currencyInfo.id != currencyAmount.currencyInfo.id)
            throw new Error('Invalid amount')

        return new CurrencyAmount(
            this.currencyInfo,
            this.baseAmount.minus(currencyAmount.baseAmount),
            this.markets,
        )
    }

    div(currencyAmount: CurrencyAmount<CI>) {
        if (currencyAmount.currencyInfo.id != currencyAmount.currencyInfo.id)
            throw new Error('Invalid amount')

        return new CurrencyAmount(
            this.currencyInfo,
            this.baseAmount.div(currencyAmount.baseAmount),
            this.markets,
        )
    }

    mul(currencyAmount: CurrencyAmount<CI>) {
        if (currencyAmount.currencyInfo.id != currencyAmount.currencyInfo.id)
            throw new Error('Invalid amount')

        return new CurrencyAmount(
            this.currencyInfo,
            this.baseAmount.mul(currencyAmount.baseAmount),
            this.markets,
        )
    }

    async toFiat(fiatCurrency: (typeof FiatCurrencies)[number], useCache: boolean = true) {
        const markets = await this.markets.get(useCache)

        const cryptoData = markets.crypto.find((t) => t.id === this.currencyInfo.nativeTokenId)
        if (!cryptoData) throw new Error('Crypto rate not found')
        const cryptoRateUsd = toDecimal(cryptoData.rateUsd)
        const totalUsd = cryptoRateUsd.mul(this.baseAmount)

        const fiatData = markets.fiat.find((t) => t.symbol === fiatCurrency)
        if (!fiatData) throw new Error(`Fiat currency ${fiatCurrency} not found`)
        const fiatRateUsd = toDecimal(fiatData.rateUsd)

        return totalUsd.div(fiatRateUsd)
    }
}
