import {ArbitrumApi, ChainGateClient} from 'chaingate-client'
import {buildUrlWithApiKey} from '../../../../Utils/Utils'
import {Evm} from '../abstract/Evm/Evm'
import {CurrencyProviders} from '../CurrencyProviders'

export class Arbitrum extends Evm<'arb'> {
    constructor(client: ChainGateClient, api: ArbitrumApi, currencyProviders: CurrencyProviders) {
        super({
            symbol: 'arb',
            id: 'arbitrum',
            name: 'Arbitrum One',
            svgLogoUrl: buildUrlWithApiKey('https://api.chaingate.dev/arbitrum/logo'),
            chainId: 0xa4b1,
            decimals: 18,
            defaultDerivationPath: 'm/44\'/60\'/0\'/0/0',
            minimalUnitSymbol: 'wei',
            commonDerivationPaths: ['m/44\'/60\'/0\'/0/0',],
            nativeTokenId: 'arbitrum',
            nativeTokenName: 'Arbitrum'
        }, client, api, currencyProviders)
    }
}
