import { Bech32UtxoWallet } from '../../abstract/Bech32UtxoWallet/Bech32UtxoWallet'
import { Transports } from '../../Transports'
import { LitecoinInfo } from '../../../CurrencyInfo'
import { LitecoinUtils } from '../../../CurrencyUtils'

export class LitecoinWallet extends Bech32UtxoWallet<typeof LitecoinInfo> {
    constructor(utils: LitecoinUtils, transports: Transports) {
        super(utils, transports, {
            bech32: 'ltc',
            pubKeyHash: 0x30,
            scriptHash: 0x32,
            wif: 0xb0,
        })
    }
}
