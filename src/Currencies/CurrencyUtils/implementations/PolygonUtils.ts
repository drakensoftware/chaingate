import { Client } from '@hey-api/client-fetch'
import { TtlCache } from '../../../InternalUtils/TtlCache'
import { GlobalMarketsResponse } from '../../../Client'
import { PolygonInfo } from '../../CurrencyInfo'
import { EvmCurrencyUtils } from '../abstract/EvmCurrencyUtils'

export class PolygonUtils extends EvmCurrencyUtils<typeof PolygonInfo> {
    constructor(client: Client, markets: TtlCache<GlobalMarketsResponse>) {
        super(client, PolygonInfo, markets, 'polygon')
    }
}
