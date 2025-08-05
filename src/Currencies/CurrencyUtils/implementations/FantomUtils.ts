import { Client } from '@hey-api/client-fetch'
import { TtlCache } from '../../../InternalUtils/TtlCache'
import { GlobalMarketsResponse } from '../../../Client'
import { FantomInfo } from '../../CurrencyInfo'
import { EvmCurrencyUtils } from '../abstract/EvmCurrencyUtils'

export class FantomUtils extends EvmCurrencyUtils<typeof FantomInfo> {
    constructor(client: Client, markets: TtlCache<GlobalMarketsResponse>) {
        super(client, FantomInfo, markets, 'fantom')
    }
}
