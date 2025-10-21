import { ChainGateContext } from '../ChainGateContext'
import { FantomInfo } from '../../CurrencyInfo'
import { EvmCurrencyUtils } from '../abstract/EvmCurrencyUtils'

export class FantomUtils extends EvmCurrencyUtils<typeof FantomInfo> {
    constructor(context: ChainGateContext) {
        super(context, FantomInfo, 'fantom')
    }
}
