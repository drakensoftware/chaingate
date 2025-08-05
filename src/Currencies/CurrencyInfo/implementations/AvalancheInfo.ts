import { buildUrlWithApiKey } from '../../../InternalUtils/Utils'
import { EvmCurrencyInfo } from '../CurrencyInfo'

export const AvalancheInfo: EvmCurrencyInfo = {
    symbol: 'avax',
    id: 'avalanche',
    name: 'Avalanche C-Chain',
    svgLogoUrl: buildUrlWithApiKey('https://api.chaingate.dev/avalanche/logo'),
    chainId: 0xa86a,
    decimals: 18,
    defaultDerivationPath: "m/44'/60'/0'/0/0",
    minimalUnitSymbol: 'wei',
    commonDerivationPaths: ["m/44'/60'/0'/0/0"],
    nativeTokenId: 'avalanche',
    nativeTokenName: 'Avalanche',
    supportsEIP1559: true,
} as const
