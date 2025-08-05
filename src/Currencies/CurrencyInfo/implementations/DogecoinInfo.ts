import { buildUrlWithApiKey } from '../../../InternalUtils/Utils'
import { CurrencyInfo } from '../CurrencyInfo'

export const DogecoinInfo: CurrencyInfo = {
    symbol: 'doge',
    id: 'dogecoin',
    name: 'Dogecoin',
    svgLogoUrl: buildUrlWithApiKey('https://api.chaingate.dev/dogecoin/logo'),
    decimals: 8,
    defaultDerivationPath: "m/44'/3'/0'/0/0",
    minimalUnitSymbol: 'satoshi',
    commonDerivationPaths: ["m/44'/3'/0'/0/0", "m/84'/3'/0'/0/0", "m/86'/3'/0'/0/0"],
    nativeTokenId: 'dogecoin',
    nativeTokenName: 'Dogecoin',
} as const
