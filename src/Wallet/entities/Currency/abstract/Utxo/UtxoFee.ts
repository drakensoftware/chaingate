import {CurrencyFee} from '../../CurrencyFee'
import {CurrencyAmount} from '../../CurrencyAmount'

export class UtxoFee extends CurrencyFee{
    public readonly feePerKb: CurrencyAmount


    constructor(feePerKb: CurrencyAmount , isApproximate: boolean, enoughFunds: boolean, confirmationTimeSecs?: number, feeAmount?: CurrencyAmount) {
        super(isApproximate, enoughFunds, confirmationTimeSecs, feeAmount)
        this.feePerKb = feePerKb
    }

}
