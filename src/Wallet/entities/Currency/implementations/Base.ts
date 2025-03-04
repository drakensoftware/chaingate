import {BaseApi} from 'chaingate-client'
import {buildUrlWithApiKey} from '../../../../Utils/Utils'
import {HDPrivateKeySign, PrivateKeySign} from '../CurrencyParams'
import {Evm} from '../abstract/Evm/Evm'

export class Base extends Evm<'eth'> {
    constructor(api: BaseApi, currencyParams: PrivateKeySign | HDPrivateKeySign) {
        super({
            symbol: 'BASE',
            id: 'ETH-BASE',
            name: 'Ethereum (Base)',
            svgLogoUrl: buildUrlWithApiKey('https://api.chaingate.dev/base/logo'),
            chainId: 0xa4b1,
            decimals: 18,
            defaultDerivationPath: 'm/44\'/60\'/0\'/0/0',
            minimalUnitSymbol: 'wei',
            commonDerivationPaths: ['m/44\'/60\'/0\'/0/0',]
        }, api, currencyParams)
    }
}
