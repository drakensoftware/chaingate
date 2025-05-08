import {ChainGateClient, UtxoApi} from 'chaingate-client'
import * as btc from '@scure/btc-signer'
import {LegacyUtxo} from '../LegacyUtxo/LegacyUtxo'
import {CurrencyInfo} from '../../CurrencyInfo'
import {NetworkParams} from '../Utxo/NetworkParams'
import {CurrencyProviders} from '../../CurrencyProviders'

export class Bech32Utxo<DefaultUnitSpecifier extends string> extends LegacyUtxo<DefaultUnitSpecifier> {
    constructor(currencyInfo: CurrencyInfo, client: ChainGateClient, api: UtxoApi, currencyProviders: CurrencyProviders, networkParams: NetworkParams) {
        super(currencyInfo, client, api, currencyProviders, networkParams)
    }

    async getAddress(addressType: 'legacy' | 'segwit' | 'taproot' = 'segwit'): Promise<string> {

        const publicKey = await (await this.currencyProviders.getPublicKeyProvider(this.currencyInfo))()
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
