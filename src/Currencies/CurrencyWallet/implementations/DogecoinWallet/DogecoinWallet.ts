import { LegacyUtxoWallet } from '../../abstract/LegacyUtxoWallet/LegacyUtxoWallet'
import { Transports } from '../../Transports'
import { DogecoinInfo } from '../../../CurrencyInfo'
import { UtxoCurrencyUtils } from '../../../CurrencyUtils/abstract/UtxoCurrencyUtils/UtxoCurrencyUtils'

export class DogecoinWallet extends LegacyUtxoWallet<typeof DogecoinInfo> {
    declare transports: Transports

    constructor(utils: UtxoCurrencyUtils<typeof DogecoinInfo>, transports: Transports) {
        super(utils, transports, {
            bech32: null,
            pubKeyHash: 0x1e,
            scriptHash: 0x16,
            wif: 0x9e,
        })
    }

    async getAddress(): Promise<string> {
        return this.utils.publicKeyToAddress(await this.getPublicKey())
    }
}
