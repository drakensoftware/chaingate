import { ChainGateContext } from '../ChainGateContext'
import { ArbitrumInfo } from '../../CurrencyInfo'
import { EvmCurrencyUtils } from '../abstract/EvmCurrencyUtils'

export class ArbitrumUtils extends EvmCurrencyUtils<typeof ArbitrumInfo> {
    constructor(context: ChainGateContext) {
        super(context, ArbitrumInfo, 'arbitrum')
    }
}
