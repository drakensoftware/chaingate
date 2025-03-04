import {PolygonApi} from 'chaingate-client'
import {buildUrlWithApiKey} from '../../../../Utils/Utils'
import {Evm} from '../abstract/Evm/Evm'
import {HDPrivateKeySign, PrivateKeySign} from '../CurrencyParams'

export class Polygon extends Evm<'pol'> {
    constructor(api: PolygonApi, currencyParams: PrivateKeySign | HDPrivateKeySign) {
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
        }, api, currencyParams)
    }
}
