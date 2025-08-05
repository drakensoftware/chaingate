import { Bech32UtxoWallet } from '../../abstract/Bech32UtxoWallet/Bech32UtxoWallet'
import { Transports } from '../../Transports'
import { BitcoinInfo } from '../../../CurrencyInfo'
import { UtxoCurrencyUtils } from '../../../CurrencyUtils/abstract/UtxoCurrencyUtils/UtxoCurrencyUtils'

export class BitcoinWallet extends Bech32UtxoWallet<typeof BitcoinInfo> {
    constructor(utils: UtxoCurrencyUtils<typeof BitcoinInfo>, transports: Transports) {
        super(utils, transports, {
            bech32: 'bc',
            pubKeyHash: 0x00,
            scriptHash: 0x05,
            wif: 0x80,
        })
    }
}
