import { Client } from '@hey-api/client-fetch'
import { TtlCache } from '../../InternalUtils/TtlCache'
import { GlobalMarketsResponse } from '../../Client'

export type ChainGateContext = {
    client: Client
    markets: TtlCache<GlobalMarketsResponse>
    extra: Map<string, object>
}
