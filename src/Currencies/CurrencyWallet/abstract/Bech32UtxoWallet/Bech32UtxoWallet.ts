import { LegacyUtxoWallet } from '../LegacyUtxoWallet/LegacyUtxoWallet'
import { NetworkParams } from '../UtxoWallet/NetworkParams'
import { Transports } from '../../Transports'
import { UtxoCurrencyUtils } from '../../../CurrencyUtils/abstract/UtxoCurrencyUtils/UtxoCurrencyUtils'
import { CurrencyInfo } from '../../../CurrencyInfo'
import {
    AddressTypeSupported,
    Bech32UtxoCurrencyUtils,
} from '../../../CurrencyUtils/abstract/Bech32UtxoCurrencyUtils/Bech32UtxoCurrencyUtils'

export class Bech32UtxoWallet<CI extends CurrencyInfo> extends LegacyUtxoWallet<CI> {
    declare utils: Bech32UtxoCurrencyUtils<CI>

    constructor(
        utils: UtxoCurrencyUtils<CI>,
        transports: Transports,
        networkParams: NetworkParams,
    ) {
        super(utils, transports, networkParams)
    }

    async getAddress(addressType: AddressTypeSupported = 'segwit-p2wpkh'): Promise<string> {
        const publicKey = await (
            await this.transports.getPublicKeyProvider(this.utils.currencyInfo.id)
        )()
        return this.utils.publicKeyToAddress(publicKey, addressType)
    }
}
