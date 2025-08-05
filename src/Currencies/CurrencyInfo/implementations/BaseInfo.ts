import { buildUrlWithApiKey } from '../../../InternalUtils/Utils'
import { EvmCurrencyInfo } from '../CurrencyInfo'

export const BaseInfo: EvmCurrencyInfo = {
    symbol: 'eth',
    id: 'base',
    name: 'Ethereum (Base)',
    svgLogoUrl: buildUrlWithApiKey('https://api.chaingate.dev/base/logo'),
    chainId: 0x2105,
    decimals: 18,
    defaultDerivationPath: "m/44'/60'/0'/0/0",
    minimalUnitSymbol: 'wei',
    commonDerivationPaths: ["m/44'/60'/0'/0/0"],
    nativeTokenId: 'base',
    nativeTokenName: 'Base',
    supportsEIP1559: true,
} as const
