import Decimal from 'decimal.js'
import {CurrencyInfo} from './CurrencyInfo'

export class CurrencyAmount {
    private readonly currencyInfo: CurrencyInfo
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

    constructor(currencyInfo: CurrencyInfo, baseAmount: Decimal){
        this.currencyInfo = currencyInfo
        this.baseAmount = baseAmount
        this.decimals = currencyInfo.decimals
    }

    plus(currencyAmount: CurrencyAmount){
        if(currencyAmount.currencyInfo.id != currencyAmount.currencyInfo.id
        ) throw new Error('Invalid amount')

        return new CurrencyAmount(this.currencyInfo, this.baseAmount.plus(currencyAmount.baseAmount))
    }

    minus(currencyAmount: CurrencyAmount){
        if(currencyAmount.currencyInfo.id != currencyAmount.currencyInfo.id
        ) throw new Error('Invalid amount')

        return new CurrencyAmount(this.currencyInfo, this.baseAmount.minus(currencyAmount.baseAmount))
    }

    div(currencyAmount: CurrencyAmount){
        if(currencyAmount.currencyInfo.id != currencyAmount.currencyInfo.id
        ) throw new Error('Invalid amount')

        return new CurrencyAmount(this.currencyInfo, this.baseAmount.div(currencyAmount.baseAmount))
    }

    mul(currencyAmount: CurrencyAmount){
        if(currencyAmount.currencyInfo.id != currencyAmount.currencyInfo.id
        ) throw new Error('Invalid amount')

        return new CurrencyAmount(this.currencyInfo, this.baseAmount.mul(currencyAmount.baseAmount))
    }


}
