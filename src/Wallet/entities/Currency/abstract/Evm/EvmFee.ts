import {CurrencyAmount} from '../../CurrencyAmount'
import {CurrencyFee} from '../../CurrencyFee'

export class EvmFee extends CurrencyFee{
    public readonly maxFeePerGas: CurrencyAmount
    public readonly maxPriorityFeePerGas: CurrencyAmount

    constructor(maxFeePerGas: CurrencyAmount, maxPriorityFeePerGas: CurrencyAmount, isApproximate: boolean, enoughFunds: boolean, confirmationTimeSecs?: number, feeAmount?: CurrencyAmount) {
        super(isApproximate, enoughFunds, confirmationTimeSecs, feeAmount)
        this.maxFeePerGas = maxFeePerGas
        this.maxPriorityFeePerGas = maxPriorityFeePerGas
    }
}
