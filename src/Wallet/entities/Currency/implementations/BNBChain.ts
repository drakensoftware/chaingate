import {BNBChainApi, ChainGateClient} from 'chaingate-client'
import {buildUrlWithApiKey} from '../../../../Utils/Utils'
import {Evm} from '../abstract/Evm/Evm'
import {CurrencyProviders} from '../CurrencyProviders'

export class BNBChain extends Evm<'bnb'> {
    constructor(client: ChainGateClient, api: BNBChainApi, currencyProviders: CurrencyProviders) {
        super({
            symbol: 'bnb',
            id: 'bnb',
            name: 'BNB Chain',
            svgLogoUrl: buildUrlWithApiKey('https://api.chaingate.dev/bnb/logo'),
            chainId: 0x38,
            decimals: 18,
            defaultDerivationPath: 'm/44\'/60\'/0\'/0/0',
            minimalUnitSymbol: 'wei',
            commonDerivationPaths: ['m/44\'/60\'/0\'/0/0',],
            nativeTokenId: 'bnb',
            nativeTokenName: 'BNB'
        }, client, api, currencyProviders)
    }
}
