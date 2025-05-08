import {BitcoinApi, ChainGateClient} from 'chaingate-client'
import {buildUrlWithApiKey} from '../../../../../Utils/Utils'
import {Bech32Utxo} from '../../abstract/Bech32Utxo/Bech32Utxo'
import {CurrencyProviders} from '../../CurrencyProviders'

export class Bitcoin extends Bech32Utxo<'btc'> {
    constructor(client: ChainGateClient, api: BitcoinApi,  currencyProviders: CurrencyProviders) {
        super({
            symbol: 'btc',
            id: 'bitcoin',
            name: 'Bitcoin',
            svgLogoUrl: buildUrlWithApiKey('https://api.chaingate.dev/bitcoin/logo'),
            decimals: 8,
            defaultDerivationPath: 'm/84\'/0\'/0\'/0/0',
            minimalUnitSymbol: 'satoshi',
            commonDerivationPaths: ['m/44\'/0\'/0\'/0/0', 'm/84\'/0\'/0\'/0/0', 'm/86\'/0\'/0\'/0/0'],
            nativeTokenId: 'bitcoin',
            nativeTokenName: 'Bitcoin'
        },
        client,
        api,
        currencyProviders,
        {
            bech32: 'bc',
            pubKeyHash: 0x00,
            scriptHash: 0x05,
            wif: 0x80
        })
    }
}
