import { ChainGateContext } from '../ChainGateContext'
import { AvalancheInfo } from '../../CurrencyInfo'
import { EvmCurrencyUtils } from '../abstract/EvmCurrencyUtils'

export class AvalancheUtils extends EvmCurrencyUtils<typeof AvalancheInfo> {
    constructor(context: ChainGateContext) {
        super(context, AvalancheInfo, 'avalanche')
    }
}
