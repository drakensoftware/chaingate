import { ChainGateContext } from '../ChainGateContext'
import { BnbInfo } from '../../CurrencyInfo'
import { EvmCurrencyUtils } from '../abstract/EvmCurrencyUtils'

export class BnbUtils extends EvmCurrencyUtils<typeof BnbInfo> {
    constructor(context: ChainGateContext) {
        super(context, BnbInfo, 'bnb')
    }
}
