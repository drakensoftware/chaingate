import {UtxoApi} from 'chaingate-client'
import * as btc from '@scure/btc-signer'
import {LegacyUtxo} from '../LegacyUtxo/LegacyUtxo'
import {HDPrivateKeySign, PrivateKeySign} from '../../CurrencyParams'
import {CurrencyInfo} from '../../CurrencyInfo'
import {NetworkParams} from '../Utxo/NetworkParams'

export type WalletType = 'legacy' | 'segwit' | 'taproot'

export class Bech32Utxo<DefaultUnitSpecifier extends string> extends LegacyUtxo<DefaultUnitSpecifier> {
    declare currencyParams: PrivateKeySign | HDPrivateKeySign

    constructor(currencyInfo: CurrencyInfo, api: UtxoApi, currencyParams: PrivateKeySign | HDPrivateKeySign, networkParams: NetworkParams) {
        super(currencyInfo, api, currencyParams, networkParams)
    }

    async getAddress(addressType: 'legacy' | 'segwit' | 'taproot' = 'segwit'): Promise<string> {

        let publicKey
        if(this.currencyParams.signMode == 'privateKey') publicKey = await this.currencyParams.getPublicKey()
        else publicKey = await this.currencyParams.getPublicKey(this.currencyParams.getDerivationPath(this.currencyInfo))

        let publicKeyRaw = publicKey.raw

        switch (addressType) {
        case 'legacy':
            return btc.p2pkh(publicKeyRaw, this.networkParams).address
        case 'segwit':
            return btc.p2wpkh(publicKeyRaw, this.networkParams).address
        case 'taproot':
            if(publicKeyRaw.length == 33) publicKeyRaw = publicKeyRaw.slice(1)
            return btc.p2tr(publicKeyRaw, undefined, this.networkParams).address
        }
    }
}
