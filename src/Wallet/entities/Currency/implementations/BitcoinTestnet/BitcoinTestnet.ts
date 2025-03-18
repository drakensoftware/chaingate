import {BitcoinTestnetApi} from 'chaingate-client'
import {buildUrlWithApiKey} from '../../../../../Utils/Utils'
import {Bech32Utxo} from '../../abstract/Bech32Utxo/Bech32Utxo'
import {CurrencyProviders} from '../../CurrencyProviders'

export class BitcoinTestnet extends Bech32Utxo<'btc'> {

    constructor(api: BitcoinTestnetApi,  currencyProviders: CurrencyProviders) {
        super({
            symbol: 'BTC-TEST',
            id: 'bitcoin-testnet',
            name: 'Bitcoin Testnet',
            svgLogoUrl: buildUrlWithApiKey('https://api.chaingate.dev/bitcoin/testnet/logo'),
            decimals: 8,
            defaultDerivationPath: 'm/84\'/1\'/0\'/0/0',
            minimalUnitSymbol: 'satoshi',
            commonDerivationPaths: ['m/44\'/1\'/0\'/0/0', 'm/84\'/1\'/0\'/0/0', 'm/86\'/1\'/0\'/0/0']
        },
        api,
        currencyProviders,
        {
            bech32: 'tb',
            pubKeyHash: 0x6f,
            scriptHash: 0xc4,
            wif: 0xef
        })
    }
}
