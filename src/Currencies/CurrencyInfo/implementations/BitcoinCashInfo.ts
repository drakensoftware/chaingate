import { buildUrlWithApiKey } from '../../../InternalUtils/Utils'
import { CurrencyInfo } from '../CurrencyInfo'

export const BitcoinCashInfo: CurrencyInfo = {
    symbol: 'bch',
    id: 'bitcoinCash',
    name: 'Bitcoin Cash',
    svgLogoUrl: buildUrlWithApiKey('https://api.chaingate.dev/bitcoincash/logo'),
    decimals: 8,
    defaultDerivationPath: "m/44'/145'/0'/0/0",
    minimalUnitSymbol: 'satoshi',
    commonDerivationPaths: ["m/44'/145'/0'/0/0"],
    nativeTokenId: 'bitcoincash',
    nativeTokenName: 'Bitcoin Cash',
} as const
