import { Client } from '@hey-api/client-fetch'
import { TtlCache } from '../../../InternalUtils/TtlCache'
import { GlobalMarketsResponse } from '../../../Client'
import { BnbInfo } from '../../CurrencyInfo'
import { EvmCurrencyUtils } from '../abstract/EvmCurrencyUtils'

export class BnbUtils extends EvmCurrencyUtils<typeof BnbInfo> {
    constructor(client: Client, markets: TtlCache<GlobalMarketsResponse>) {
        super(client, BnbInfo, markets, 'bnb')
    }
}
