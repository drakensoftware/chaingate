import { buildUrlWithApiKey } from '../../../InternalUtils/Utils'
import { EvmCurrencyInfo } from '../CurrencyInfo'

export const EthereumInfo: EvmCurrencyInfo = {
    symbol: 'eth',
    id: 'ethereum',
    name: 'Ethereum',
    svgLogoUrl: buildUrlWithApiKey('https://api.chaingate.dev/ethereum/logo'),
    chainId: 0x01,
    decimals: 18,
    defaultDerivationPath: "m/44'/60'/0'/0/0",
    minimalUnitSymbol: 'wei',
    commonDerivationPaths: ["m/44'/60'/0'/0/0"],
    nativeTokenId: 'ethereum',
    nativeTokenName: 'Ethereum',
    supportsEIP1559: true,
} as const
