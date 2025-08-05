import { buildUrlWithApiKey } from '../../../InternalUtils/Utils'
import { CurrencyInfo } from '../CurrencyInfo'

export const BitcoinInfo: CurrencyInfo = {
    symbol: 'btc',
    id: 'bitcoin',
    name: 'Bitcoin',
    svgLogoUrl: buildUrlWithApiKey('https://api.chaingate.dev/bitcoin/logo'),
    decimals: 8,
    defaultDerivationPath: "m/84'/0'/0'/0/0",
    minimalUnitSymbol: 'satoshi',
    commonDerivationPaths: ["m/44'/0'/0'/0/0", "m/84'/0'/0'/0/0", "m/86'/0'/0'/0/0"],
    nativeTokenId: 'bitcoin',
    nativeTokenName: 'Bitcoin',
} as const
