import { Client } from '@hey-api/client-fetch'
import { TtlCache } from '../../../InternalUtils/TtlCache'
import { GlobalMarketsResponse } from '../../../Client'
import { BitcoinTestnetInfo } from '../../CurrencyInfo'
import { Bech32UtxoCurrencyUtils } from '../abstract/Bech32UtxoCurrencyUtils/Bech32UtxoCurrencyUtils'

export class BitcoinTestnetUtils extends Bech32UtxoCurrencyUtils<typeof BitcoinTestnetInfo> {
    constructor(client: Client, markets: TtlCache<GlobalMarketsResponse>) {
        super(
            client,
            BitcoinTestnetInfo,
            markets,
            'bitcointestnet',
            {
                bech32: 'tb',
                pubKeyHash: 0x6f,
                scriptHash: 0xc4,
                wif: 0xef,
            },
            '\x18Bitcoin Signed Message:\n',
        )
    }
}
