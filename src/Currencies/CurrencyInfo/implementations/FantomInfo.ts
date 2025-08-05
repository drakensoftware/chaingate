import { buildUrlWithApiKey } from '../../../InternalUtils/Utils'
import { EvmCurrencyInfo } from '../CurrencyInfo'

export const FantomInfo: EvmCurrencyInfo = {
    symbol: 'ftm',
    id: 'fantom',
    name: 'Fantom',
    svgLogoUrl: buildUrlWithApiKey('https://api.chaingate.dev/fantom/logo'),
    chainId: 0xfa,
    decimals: 18,
    defaultDerivationPath: "m/44'/60'/0'/0/0",
    minimalUnitSymbol: 'wei',
    commonDerivationPaths: ["m/44'/60'/0'/0/0"],
    nativeTokenId: 'fantom',
    nativeTokenName: 'Fantom',
    supportsEIP1559: true,
} as const
