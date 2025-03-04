import {BNBChainApi} from 'chaingate-client'
import {buildUrlWithApiKey} from '../../../../Utils/Utils'
import {Evm} from '../abstract/Evm/Evm'
import {HDPrivateKeySign, PrivateKeySign} from '../CurrencyParams'

export class BNBChain extends Evm<'bnb'> {
    constructor(api: BNBChainApi, currencyParams: PrivateKeySign | HDPrivateKeySign) {
        super({
            symbol: 'BSC',
            id: 'bnbChain',
            name: 'BNB Chain',
            svgLogoUrl: buildUrlWithApiKey('https://api.chaingate.dev/bnb/logo'),
            chainId: 0x38,
            decimals: 18,
            defaultDerivationPath: 'm/44\'/60\'/0\'/0/0',
            minimalUnitSymbol: 'wei',
            commonDerivationPaths: ['m/44\'/60\'/0\'/0/0',]
        }, api, currencyParams)
    }
}
