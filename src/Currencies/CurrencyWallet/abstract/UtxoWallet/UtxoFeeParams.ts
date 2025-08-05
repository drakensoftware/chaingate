import { CurrencyAmount } from '../../../CurrencyUtils'
import { CurrencyInfo } from '../../../CurrencyInfo'

export type UtxoFeeParams<CI extends CurrencyInfo> = { feePerKb: CurrencyAmount<CI> }
