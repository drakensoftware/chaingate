import { buildUrlWithApiKey } from '../../../InternalUtils/Utils'
import { EvmCurrencyInfo } from '../CurrencyInfo'

export const BnbInfo: EvmCurrencyInfo = {
    symbol: 'bnb',
    id: 'bnbChain',
    name: 'BNB Chain',
    svgLogoUrl: buildUrlWithApiKey('https://api.chaingate.dev/bnb/logo'),
    chainId: 0x38,
    decimals: 18,
    defaultDerivationPath: "m/44'/60'/0'/0/0",
    minimalUnitSymbol: 'wei',
    commonDerivationPaths: ["m/44'/60'/0'/0/0"],
    nativeTokenId: 'bnb',
    nativeTokenName: 'BNB',
    supportsEIP1559: false,
} as const
