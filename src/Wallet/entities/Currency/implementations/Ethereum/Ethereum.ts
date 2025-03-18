import {EthereumApi} from 'chaingate-client'
import {buildUrlWithApiKey} from '../../../../../Utils/Utils'
import {CurrencyProviders} from '../../CurrencyProviders'
import {Evm} from '../../abstract/Evm/Evm'

export class Ethereum extends Evm<'eth'> {
    constructor(api: EthereumApi, currencyProviders: CurrencyProviders) {
        super({
            symbol: 'ETH',
            id: 'ethereum',
            name: 'Ethereum',
            svgLogoUrl: buildUrlWithApiKey('https://api.chaingate.dev/ethereum/logo'),
            chainId: 0x01,
            decimals: 18,
            defaultDerivationPath: 'm/44\'/60\'/0\'/0/0',
            minimalUnitSymbol: 'wei',
            commonDerivationPaths: ['m/44\'/60\'/0\'/0/0',]
        }, api, currencyProviders)
    }
}
