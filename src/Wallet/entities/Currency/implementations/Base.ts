import {BaseApi, ChainGateClient} from 'chaingate-client'
import {buildUrlWithApiKey} from '../../../../Utils/Utils'
import {CurrencyProviders} from '../CurrencyProviders'
import {Evm} from '../abstract/Evm/Evm'

export class Base extends Evm<'eth'> {
    constructor(client: ChainGateClient, api: BaseApi, currencyProviders: CurrencyProviders) {
        super({
            symbol: 'eth',
            id: 'base',
            name: 'Ethereum (Base)',
            svgLogoUrl: buildUrlWithApiKey('https://api.chaingate.dev/base/logo'),
            chainId: 0xa4b1,
            decimals: 18,
            defaultDerivationPath: 'm/44\'/60\'/0\'/0/0',
            minimalUnitSymbol: 'wei',
            commonDerivationPaths: ['m/44\'/60\'/0\'/0/0',],
            nativeTokenId: 'ethereum',
            nativeTokenName: 'Ethereum'
        }, client, api, currencyProviders)
    }
}
