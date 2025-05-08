import {BitcoinCashApi, ChainGateClient} from 'chaingate-client'
import {buildUrlWithApiKey} from '../../../../../Utils/Utils'
import * as btc from '@scure/btc-signer'
import {LegacyUtxo} from '../../abstract/LegacyUtxo/LegacyUtxo'
import {CurrencyProviders} from '../../CurrencyProviders'

export class Dogecoin extends LegacyUtxo<'doge'> {
    declare currencyProviders: CurrencyProviders

    constructor(client: ChainGateClient, api: BitcoinCashApi,  currencyProviders: CurrencyProviders) {
        super({
            symbol: 'doge',
            id: 'dogecoin',
            name: 'Dogecoin',
            svgLogoUrl: buildUrlWithApiKey('https://api.chaingate.dev/dogecoin/logo'),
            decimals: 8,
            defaultDerivationPath: 'm/44\'/3\'/0\'/0/0',
            minimalUnitSymbol: 'satoshi',
            commonDerivationPaths: ['m/44\'/3\'/0\'/0/0', 'm/84\'/3\'/0\'/0/0', 'm/86\'/3\'/0\'/0/0'],
            nativeTokenId: 'dogecoin',
            nativeTokenName: 'Dogecoin'
        },
        client,
        api,
        currencyProviders,
        {
            bech32: null,
            pubKeyHash: 0x1E,
            scriptHash: 0x16,
            wif: 0x9E
        })
    }

    async getAddress(): Promise<string> {
        const publicKey = await (await this.currencyProviders.getPublicKeyProvider(this.currencyInfo))()

        const publicKeyRaw = publicKey.raw

        return btc.p2pkh(publicKeyRaw, this.networkParams).address
    }
}
