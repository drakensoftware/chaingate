import { CurrencyFee } from '../../CurrencyFee'
import { CurrencyAmount } from '../../../CurrencyUtils'
import { CurrencyInfo } from '../../../CurrencyInfo'

export class UtxoFee<CI extends CurrencyInfo> extends CurrencyFee<CI> {
    public readonly feePerKb: CurrencyAmount<CI>

    constructor(
        feePerKb: CurrencyAmount<CI>,
        isApproximate: boolean,
        enoughFunds: boolean,
        confirmationTimeSecs?: number,
        feeAmount?: CurrencyAmount<CI>,
    ) {
        super(isApproximate, enoughFunds, confirmationTimeSecs, feeAmount)
        this.feePerKb = feePerKb
    }
}
