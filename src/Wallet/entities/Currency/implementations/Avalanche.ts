import {AvalancheApi} from 'chaingate-client'
import {buildUrlWithApiKey} from '../../../../Utils/Utils'
import {Evm} from '../abstract/Evm/Evm'
import {CurrencyProviders} from '../CurrencyProviders'

export class Avalanche extends Evm<'avax'> {
    constructor(api: AvalancheApi, currencyProviders: CurrencyProviders) {
        super({
            symbol: 'AVAX',
            id: 'avalanche',
            name: 'Avalanche C-Chain',
            svgLogoUrl: buildUrlWithApiKey('https://api.chaingate.dev/avalanche/logo'),
            chainId: 0xa86a,
            decimals: 18,
            defaultDerivationPath: 'm/44\'/60\'/0\'/0/0',
            minimalUnitSymbol: 'wei',
            commonDerivationPaths: ['m/44\'/60\'/0\'/0/0',]
        }, api, currencyProviders)
    }
}
