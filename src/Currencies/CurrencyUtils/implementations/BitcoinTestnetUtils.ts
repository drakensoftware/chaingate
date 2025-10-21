import { ChainGateContext } from '../ChainGateContext'
import { BitcoinTestnetInfo } from '../../CurrencyInfo'
import { Bech32UtxoCurrencyUtils } from '../abstract/Bech32UtxoCurrencyUtils/Bech32UtxoCurrencyUtils'

export class BitcoinTestnetUtils extends Bech32UtxoCurrencyUtils<typeof BitcoinTestnetInfo> {
    constructor(context: ChainGateContext) {
        super(
            context,
            BitcoinTestnetInfo,
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
