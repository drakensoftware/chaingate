import { CurrencyFee } from '../../CurrencyFee'
import { EvmCurrencyInfo } from '../../../CurrencyInfo'
import { CurrencyAmount } from '../../../CurrencyUtils'

export type LegacyTxFee<CI extends EvmCurrencyInfo> = { gasPrice: CurrencyAmount<CI> }
export type Eip1559TxFee<CI extends EvmCurrencyInfo> = {
    maxFeePerGas: CurrencyAmount<CI>
    maxPriorityFeePerGas: CurrencyAmount<CI>
}

export type FeeType<CI extends EvmCurrencyInfo> = CI['supportsEIP1559'] extends true
    ? LegacyTxFee<CI> | Eip1559TxFee<CI>
    : LegacyTxFee<CI>

export class EvmFee<CI extends EvmCurrencyInfo> extends CurrencyFee<CI> {
    public readonly gasPrice?: CurrencyAmount<CI>
    public readonly maxFeePerGas?: CurrencyAmount<CI>
    public readonly maxPriorityFeePerGas?: CurrencyAmount<CI>

    constructor(
        fee: FeeType<CI>,
        isApproximate: boolean,
        enoughFunds: boolean,
        confirmationTimeSecs?: number,
        feeAmount?: CurrencyAmount<CI>,
    ) {
        super(isApproximate, enoughFunds, confirmationTimeSecs, feeAmount)

        if ('gasPrice' in fee) {
            this.gasPrice = fee.gasPrice
        } else {
            this.maxFeePerGas = fee.maxFeePerGas
            this.maxPriorityFeePerGas = fee.maxPriorityFeePerGas
        }
    }
}
