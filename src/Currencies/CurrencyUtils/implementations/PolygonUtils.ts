import { ChainGateContext } from '../ChainGateContext'
import { PolygonInfo } from '../../CurrencyInfo'
import { EvmCurrencyUtils } from '../abstract/EvmCurrencyUtils'

export class PolygonUtils extends EvmCurrencyUtils<typeof PolygonInfo> {
    constructor(context: ChainGateContext) {
        super(context, PolygonInfo, 'polygon')
    }
}
