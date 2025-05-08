import {ChainGateClient, FantomOperaApi} from 'chaingate-client'
import {buildUrlWithApiKey} from '../../../../Utils/Utils'
import {Evm} from '../abstract/Evm/Evm'
import {CurrencyProviders} from '../CurrencyProviders'

export class Sonic extends Evm<'ftm'> {
    constructor(client: ChainGateClient, api: FantomOperaApi, currencyProviders: CurrencyProviders) {
        super({
            symbol: 's',
            id: 'fantom',
            name: 'Sonic',
            svgLogoUrl: buildUrlWithApiKey('https://api.chaingate.dev/fantom/logo'),
            chainId: 0xfa,
            decimals: 18,
            defaultDerivationPath: 'm/44\'/60\'/0\'/0/0',
            minimalUnitSymbol: 'wei',
            commonDerivationPaths: ['m/44\'/60\'/0\'/0/0',],
            nativeTokenId: 'fantom',
            nativeTokenName: 'Sonic'
        }, client, api, currencyProviders)
    }
}
