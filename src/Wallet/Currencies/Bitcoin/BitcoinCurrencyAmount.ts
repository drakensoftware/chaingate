import {CurrencyAmount} from '../Currency'
import Decimal from 'decimal.js'

export default class BitcoinCurrencyAmount extends CurrencyAmount {
    private _baseAmount: Decimal

    get baseAmount(): Decimal {
        return this._baseAmount
    }
    get baseSymbol(): string {
        return 'BTC'
    }

    get minimalAmount(): Decimal {
        return this._baseAmount.mul(1_0000_0000)
    }

    get minimalSymbol(): string {
        return 'satoshis'
    }

    get btc(): Decimal {
        return this._baseAmount
    }

    get satoshis(): Decimal {
        return this._baseAmount.mul(1_0000_0000)
    }

    constructor(baseAmount: Decimal) {
        super()
        this._baseAmount = baseAmount
    }
}
