import { Client } from '@hey-api/client-fetch'
import { TtlCache } from '../../../InternalUtils/TtlCache'
import { GlobalMarketsResponse } from '../../../Client'
import { LitecoinInfo } from '../../CurrencyInfo'
import { Bech32UtxoCurrencyUtils } from '../abstract/Bech32UtxoCurrencyUtils/Bech32UtxoCurrencyUtils'

export class LitecoinUtils extends Bech32UtxoCurrencyUtils<typeof LitecoinInfo> {
    constructor(client: Client, markets: TtlCache<GlobalMarketsResponse>) {
        super(
            client,
            LitecoinInfo,
            markets,
            'litecoin',
            {
                bech32: 'ltc',
                pubKeyHash: 0x30,
                scriptHash: 0x32,
                wif: 0xb0,
            },
            '\x19Litecoin Signed Message:\n',
        )
    }
}
