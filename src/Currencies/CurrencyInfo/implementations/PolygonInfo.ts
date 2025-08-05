import { buildUrlWithApiKey } from '../../../InternalUtils/Utils'
import { EvmCurrencyInfo } from '../CurrencyInfo'

export const PolygonInfo: EvmCurrencyInfo = {
    symbol: 'pol',
    id: 'polygon',
    name: 'POL (ex MATIC)',
    svgLogoUrl: buildUrlWithApiKey('https://api.chaingate.dev/polygon/logo'),
    chainId: 0x89,
    decimals: 18,
    defaultDerivationPath: "m/44'/60'/0'/0/0",
    minimalUnitSymbol: 'wei',
    commonDerivationPaths: ["m/44'/60'/0'/0/0"],
    nativeTokenId: 'polygon',
    nativeTokenName: 'Polygon',
    supportsEIP1559: true,
} as const
