import { buildUrlWithApiKey } from '../../../InternalUtils/Utils'
import { CurrencyInfo } from '../CurrencyInfo'

export const LitecoinInfo: CurrencyInfo = {
    symbol: 'ltc',
    id: 'litecoin',
    name: 'Litecoin',
    svgLogoUrl: buildUrlWithApiKey('https://api.chaingate.dev/litecoin/logo'),
    decimals: 8,
    defaultDerivationPath: "m/84'/2'/0'/0/0",
    minimalUnitSymbol: 'satoshi',
    commonDerivationPaths: ["m/44'/2'/0'/0/0", "m/84'/2'/0'/0/0", "m/86'/2'/0'/0/0"],
    nativeTokenId: 'litecoin',
    nativeTokenName: 'Litecoin',
} as const
