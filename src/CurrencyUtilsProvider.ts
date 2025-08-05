import { GlobalMarketsResponse } from './Client'
import { TtlCache } from './InternalUtils/TtlCache'
import { Client } from '@hey-api/client-fetch'
import { CurrencyModules } from './Currencies/CurrencyModules'

type CurrencyKey = keyof typeof CurrencyModules
type CurrencyUtilsCtor<K extends CurrencyKey> = (typeof CurrencyModules)[K]['utils']
type CurrencyUtilsInst<K extends CurrencyKey> = InstanceType<CurrencyUtilsCtor<K>>

export class CurrencyUtilsProvider {
    private readonly client: Client
    private readonly markets: TtlCache<GlobalMarketsResponse>

    constructor(client: Client, markets: TtlCache<GlobalMarketsResponse>) {
        this.client = client
        this.markets = markets
    }

    currency<C extends keyof typeof CurrencyModules>(id: C): CurrencyUtilsInst<C> {
        const UtilsCtor = CurrencyModules[id].utils as CurrencyUtilsCtor<C>
        return new UtilsCtor(this.client, this.markets) as CurrencyUtilsInst<C>
    }
}
