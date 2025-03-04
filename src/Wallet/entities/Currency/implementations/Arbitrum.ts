import {ArbitrumApi} from 'chaingate-client'
import {buildUrlWithApiKey} from '../../../../Utils/Utils'
import {Evm} from '../abstract/Evm/Evm'
import {HDPrivateKeySign, PrivateKeySign} from '../CurrencyParams'

export class Arbitrum extends Evm<'arb'> {
    constructor(api: ArbitrumApi, currencyParams: PrivateKeySign | HDPrivateKeySign) {
        super({
            symbol: 'ARB',
            id: 'arbitrum',
            name: 'Arbitrum One',
            svgLogoUrl: buildUrlWithApiKey('https://api.chaingate.dev/arbitrum/logo'),
            chainId: 0xa4b1,
            decimals: 18,
            defaultDerivationPath: 'm/44\'/60\'/0\'/0/0',
            minimalUnitSymbol: 'wei',
            commonDerivationPaths: ['m/44\'/60\'/0\'/0/0',]
        }, api, currencyParams)
    }
}
