import { Client } from '@hey-api/client-fetch'
import { TtlCache } from '../../../InternalUtils/TtlCache'
import { GlobalMarketsResponse } from '../../../Client'
import { ArbitrumInfo } from '../../CurrencyInfo'
import { EvmCurrencyUtils } from '../abstract/EvmCurrencyUtils'

export class ArbitrumUtils extends EvmCurrencyUtils<typeof ArbitrumInfo> {
    constructor(client: Client, markets: TtlCache<GlobalMarketsResponse>) {
        super(client, ArbitrumInfo, markets, 'arbitrum')
    }
}
