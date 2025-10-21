import { ChainGateContext } from '../ChainGateContext'
import { BaseInfo } from '../../CurrencyInfo'
import { EvmCurrencyUtils } from '../abstract/EvmCurrencyUtils'

export class BaseUtils extends EvmCurrencyUtils<typeof BaseInfo> {
    constructor(context: ChainGateContext) {
        super(context, BaseInfo, 'base')
    }
}
