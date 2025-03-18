import {BaseApi} from 'chaingate-client'
import {buildUrlWithApiKey} from '../../../../Utils/Utils'
import {CurrencyProviders} from '../CurrencyProviders'
import {Evm} from '../abstract/Evm/Evm'

export class Base extends Evm<'eth'> {
    constructor(api: BaseApi, currencyProviders: CurrencyProviders) {
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
        }, api, currencyProviders)
    }
}
