import { ChainGateContext } from '../ChainGateContext'
import { BitcoinInfo } from '../../CurrencyInfo'
import { Bech32UtxoCurrencyUtils } from '../abstract/Bech32UtxoCurrencyUtils/Bech32UtxoCurrencyUtils'

export class BitcoinUtils extends Bech32UtxoCurrencyUtils<typeof BitcoinInfo> {
    constructor(context: ChainGateContext) {
        super(
            context,
            BitcoinInfo,
            'bitcoin',
            {
                bech32: 'bc',
                pubKeyHash: 0x00,
                scriptHash: 0x05,
                wif: 0x80,
            },
            '\x18Bitcoin Signed Message:\n',
        )
    }
}
