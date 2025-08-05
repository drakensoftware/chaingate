import { CurrencyAmount } from '../CurrencyUtils'
import { CurrencyInfo } from '../CurrencyInfo'

export abstract class CurrencyFee<CI extends CurrencyInfo> {
    public readonly feeAmount: CurrencyAmount<CI>
    public readonly isApproximate: boolean
    public readonly confirmationTimeSecs: number
    public readonly enoughFunds: boolean

    protected constructor(
        isApproximate: boolean,
        enoughFunds: boolean,
        confirmationTimeSecs?: number,
        amount?: CurrencyAmount<CI>,
    ) {
        this.isApproximate = isApproximate
        this.confirmationTimeSecs = confirmationTimeSecs
        this.enoughFunds = enoughFunds
        this.feeAmount = amount
    }
}
