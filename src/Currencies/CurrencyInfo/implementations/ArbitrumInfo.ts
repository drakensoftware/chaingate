import { buildUrlWithApiKey } from '../../../InternalUtils/Utils'
import { EvmCurrencyInfo } from '../CurrencyInfo'

export const ArbitrumInfo: EvmCurrencyInfo = {
    symbol: 'arb',
    id: 'arbitrum',
    name: 'Arbitrum One',
    svgLogoUrl: buildUrlWithApiKey('https://api.chaingate.dev/arbitrum/logo'),
    chainId: 0xa4b1,
    decimals: 18,
    defaultDerivationPath: "m/44'/60'/0'/0/0",
    minimalUnitSymbol: 'wei',
    commonDerivationPaths: ["m/44'/60'/0'/0/0"],
    nativeTokenId: 'arbitrum',
    nativeTokenName: 'Arbitrum',
    supportsEIP1559: true,
} as const
