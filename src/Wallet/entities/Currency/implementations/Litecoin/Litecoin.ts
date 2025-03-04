import {LitecoinApi} from 'chaingate-client'
import {buildUrlWithApiKey} from '../../../../../Utils/Utils'
import {Bech32Utxo} from '../../abstract/Bech32Utxo/Bech32Utxo'
import {HDPrivateKeySign, PrivateKeySign} from '../../CurrencyParams'

export class Litecoin extends Bech32Utxo<'ltc'> {
    constructor(api: LitecoinApi,  currencyParams: PrivateKeySign | HDPrivateKeySign) {
        super({
            symbol: 'LTC',
            id: 'litecoin',
            name: 'Litecoin',
            svgLogoUrl: buildUrlWithApiKey('https://api.chaingate.dev/litecoin/logo'),
            decimals: 8,
            defaultDerivationPath: 'm/84\'/2\'/0\'/0/0',
            minimalUnitSymbol: 'satoshi',
            commonDerivationPaths: ['m/44\'/2\'/0\'/0/0', 'm/84\'/2\'/0\'/0/0', 'm/86\'/2\'/0\'/0/0']
        },
        api,
        currencyParams,
        {
            bech32: 'ltc',
            pubKeyHash: 0x30,
            scriptHash: 0x32,
            wif: 0xb0
        })
    }
}
