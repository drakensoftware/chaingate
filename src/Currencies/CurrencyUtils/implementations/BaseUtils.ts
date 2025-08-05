import { Client } from '@hey-api/client-fetch'
import { TtlCache } from '../../../InternalUtils/TtlCache'
import { GlobalMarketsResponse } from '../../../Client'
import { BaseInfo } from '../../CurrencyInfo'
import { EvmCurrencyUtils } from '../abstract/EvmCurrencyUtils'

export class BaseUtils extends EvmCurrencyUtils<typeof BaseInfo> {
    constructor(client: Client, markets: TtlCache<GlobalMarketsResponse>) {
        super(client, BaseInfo, markets, 'base')
    }
}
