import {ChainGateClient, PolygonApi} from 'chaingate-client'
import {buildUrlWithApiKey} from '../../../../Utils/Utils'
import {Evm} from '../abstract/Evm/Evm'
import {CurrencyProviders} from '../CurrencyProviders'

export class Polygon extends Evm<'pol'> {
    constructor(client: ChainGateClient, api: PolygonApi, currencyProviders: CurrencyProviders) {
        super({
            symbol: 'POL',
            id: 'polygon',
            name: 'Polygon',
            svgLogoUrl: buildUrlWithApiKey('https://api.chaingate.dev/polygon/logo'),
            chainId: 0x89,
            decimals: 18,
            defaultDerivationPath: 'm/44\'/60\'/0\'/0/0',
            minimalUnitSymbol: 'wei',
            commonDerivationPaths: ['m/44\'/60\'/0\'/0/0',]
        }, client, api, currencyProviders)
    }
}
