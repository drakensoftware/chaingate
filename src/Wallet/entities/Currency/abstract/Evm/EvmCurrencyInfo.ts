import {CurrencyInfo} from '../../CurrencyInfo'

export type EvmCurrencyInfo = CurrencyInfo & {
    chainId: number
}
