import { ChainGateContext } from '../ChainGateContext'
import { LitecoinInfo } from '../../CurrencyInfo'
import { Bech32UtxoCurrencyUtils } from '../abstract/Bech32UtxoCurrencyUtils/Bech32UtxoCurrencyUtils'

export class LitecoinUtils extends Bech32UtxoCurrencyUtils<typeof LitecoinInfo> {
    constructor(context: ChainGateContext) {
        super(
            context,
            LitecoinInfo,
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
