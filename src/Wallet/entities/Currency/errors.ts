// IMPROVE: Force to establish missing funds
import {CurrencyAmount} from './CurrencyAmount'

export class NotEnoughFundsError extends Error {
    public readonly missingFunds?: CurrencyAmount

    constructor(missingFunds?: CurrencyAmount) {
        if(missingFunds){
            super(`Wallet does not have enough funds. ${missingFunds.baseAmount} ${missingFunds.baseSymbol} needed.`)
        }else{
            super('Wallet does not have enough funds.')
        }
        this.missingFunds = missingFunds
        if (Error.captureStackTrace) Error.captureStackTrace(this, NotEnoughFundsError)
        this.name = this.constructor.name
    }
}

export class CannotDerive extends Error {
    constructor() {
        super('Derivation path are not supported (Are you using an imported private key?)')
        if (Error.captureStackTrace) Error.captureStackTrace(this, CannotDerive)
        this.name = this.constructor.name
    }
}

export class CannotParseAmount extends Error {
    constructor(amountStr: string) {
        super(`Invalid amount: ${amountStr}`)
        if (Error.captureStackTrace) Error.captureStackTrace(this, CannotDerive)
        this.name = this.constructor.name
    }
}
