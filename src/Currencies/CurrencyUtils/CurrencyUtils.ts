import { CurrencyInfo } from '../CurrencyInfo'
import { CurrencyAmount } from './CurrencyAmount'
import { FiatCurrencies } from '../FiatCurrencies'
import { NumberLike, toDecimal } from '../../InternalUtils/NumberLike'
import { PublicKey } from '../../Wallet/entities/PublicKey'
import { PrivateKey } from '../../Wallet/entities/Secret/implementations/PrivateKey'
import { ChainGateContext } from './ChainGateContext'

type DefaultUnit<T extends { symbol: string }> = T['symbol']

type MinimalUnit<T extends { minimalUnitSymbol: string }> = T['minimalUnitSymbol']

export abstract class CurrencyUtils<CI extends CurrencyInfo> {
    protected readonly context: ChainGateContext
    public readonly currencyInfo: CI

    protected constructor(context: ChainGateContext, currencyInfo: CI) {
        this.context = context
        this.currencyInfo = currencyInfo
    }

    public abstract addressBalance(
        address: string,
    ): Promise<{ confirmed: CurrencyAmount<CI>; unconfirmed: CurrencyAmount<CI> }>

    public abstract publicKeyToAddress(publicKey: PublicKey): string

    public abstract signMessage(
        message: string | Uint8Array,
        privateKey: PrivateKey,
    ): Promise<string>

    public abstract verifySignedMessage(
        message: string,
        signature: string,
        address: string,
    ): Promise<boolean>

    protected buildAmount(baseAmount: NumberLike): CurrencyAmount<CI> {
        return new CurrencyAmount(this.currencyInfo, toDecimal(baseAmount), this.context.markets)
    }

    public amount(amount: NumberLike, unit: DefaultUnit<CI> | MinimalUnit<CI>): CurrencyAmount<CI> {
        if (unit === this.currencyInfo.symbol) {
            return this.buildAmount(amount)
        }

        if (unit === this.currencyInfo.minimalUnitSymbol) {
            return this.buildAmount(
                toDecimal(amount).div(toDecimal(10).pow(this.currencyInfo.decimals)),
            )
        }

        throw new Error(`Unsupported unit: ${unit}`)
    }

    public async amountFiat(
        amountFiat: NumberLike,
        fiatCurrency: (typeof FiatCurrencies)[number],
        useCache = true,
    ): Promise<CurrencyAmount<CI>> {
        const markets = await this.context.markets.get(useCache)

        // Calculate total in usd
        const fiatData = markets.fiat.find((t) => t.symbol === fiatCurrency)
        if (!fiatData) throw new Error(`Fiat currency ${fiatCurrency} not found`)
        const fiatRateUsd = toDecimal(fiatData.rateUsd)
        const totalUsd = toDecimal(amountFiat).mul(fiatRateUsd)

        //Calculate total in crypto
        const cryptoData = markets.crypto.find((t) => t.id === this.currencyInfo.nativeTokenId)
        if (!cryptoData) throw new Error('Crypto rate not found')
        const cryptoRateUsd = toDecimal(cryptoData.rateUsd)
        if (cryptoRateUsd.eq(0)) return this.buildAmount(toDecimal(0))
        const totalCrypto = totalUsd.div(cryptoRateUsd)

        return this.buildAmount(totalCrypto)
    }

    async fiatRate(fiatCurrency: (typeof FiatCurrencies)[number], useCache = true) {
        const markets = await this.context.markets.get(useCache)

        const cryptoData = markets.crypto.find((t) => t.id === this.currencyInfo.nativeTokenId)
        if (!cryptoData) throw new Error('Crypto rate not found')
        const cryptoRateUsd = toDecimal(cryptoData.rateUsd)

        const fiatData = markets.fiat.find((t) => t.symbol === fiatCurrency)
        if (!fiatData) throw new Error(`Fiat currency ${fiatCurrency} not found`)
        const fiatRateUsd = toDecimal(fiatData.rateUsd)

        return cryptoRateUsd.div(fiatRateUsd)
    }
}
