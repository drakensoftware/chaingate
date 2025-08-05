import { Bech32UtxoWallet } from '../../abstract/Bech32UtxoWallet/Bech32UtxoWallet'
import { Transports } from '../../Transports'
import { BitcoinTestnetInfo } from '../../../CurrencyInfo'
import { UtxoCurrencyUtils } from '../../../CurrencyUtils/abstract/UtxoCurrencyUtils/UtxoCurrencyUtils'

export class BitcoinTestnetWallet extends Bech32UtxoWallet<typeof BitcoinTestnetInfo> {
    constructor(utils: UtxoCurrencyUtils<typeof BitcoinTestnetInfo>, transports: Transports) {
        super(utils, transports, {
            bech32: 'tb',
            pubKeyHash: 0x6f,
            scriptHash: 0xc4,
            wif: 0xef,
        })
    }
}
