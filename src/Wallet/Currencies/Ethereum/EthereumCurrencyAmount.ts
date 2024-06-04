import {CurrencyAmount} from '../Currency'
import Decimal from 'decimal.js'

export default class EthereumCurrencyAmount extends CurrencyAmount {
    private _baseAmount: Decimal

    get baseAmount(): Decimal {
        return this._baseAmount
    }
    get baseSymbol(): string {
        return 'ETH'
    }

    get minimalAmount(): Decimal {
        return this._baseAmount.mul('1000000000000000000')
    }

    get minimalSymbol(): string {
        return 'wei'
    }

    get eth(): Decimal {
        return this._baseAmount
    }

    get wei(): Decimal {
        return this._baseAmount.mul('1000000000000000000')
    }

    constructor(baseAmount: Decimal) {
        super()
        this._baseAmount = baseAmount
    }
}
