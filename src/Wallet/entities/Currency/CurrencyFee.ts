import {CurrencyAmount} from './CurrencyAmount'

export abstract class CurrencyFee {
    public readonly feeAmount: CurrencyAmount
    public readonly isApproximate: boolean
    public readonly confirmationTimeSecs: number
    public readonly enoughFunds: boolean

    protected constructor(isApproximate: boolean, enoughFunds: boolean, confirmationTimeSecs?: number, amount?: CurrencyAmount) {
        this.isApproximate = isApproximate
        this.confirmationTimeSecs = confirmationTimeSecs
        this.enoughFunds = enoughFunds
        this.feeAmount = amount
    }

}
