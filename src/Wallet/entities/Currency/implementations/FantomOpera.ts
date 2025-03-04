import {FantomOperaApi} from 'chaingate-client'
import {buildUrlWithApiKey} from '../../../../Utils/Utils'
import {Evm} from '../abstract/Evm/Evm'
import {HDPrivateKeySign, PrivateKeySign} from '../CurrencyParams'

export class FantomOpera extends Evm<'ftm'> {
    constructor(api: FantomOperaApi, currencyParams: PrivateKeySign | HDPrivateKeySign) {
        super({
            symbol: 'FTM',
            id: 'fantom',
            name: 'Fantom Opera',
            svgLogoUrl: buildUrlWithApiKey('https://api.chaingate.dev/fantom/logo'),
            chainId: 0xfa,
            decimals: 18,
            defaultDerivationPath: 'm/44\'/60\'/0\'/0/0',
            minimalUnitSymbol: 'wei',
            commonDerivationPaths: ['m/44\'/60\'/0\'/0/0',]
        }, api, currencyParams)
    }
}
