import { buildUrlWithApiKey } from '../../../InternalUtils/Utils'
import { CurrencyInfo } from '../CurrencyInfo'

export const BitcoinTestnetInfo: CurrencyInfo = {
    symbol: 'btc',
    id: 'bitcoinTestnet',
    name: 'Bitcoin Testnet',
    svgLogoUrl: buildUrlWithApiKey('https://api.chaingate.dev/bitcoin/testnet/logo'),
    decimals: 8,
    defaultDerivationPath: "m/84'/1'/0'/0/0",
    minimalUnitSymbol: 'satoshi',
    commonDerivationPaths: ["m/44'/1'/0'/0/0", "m/84'/1'/0'/0/0", "m/86'/1'/0'/0/0"],
    nativeTokenId: 'bitcointestnet',
    nativeTokenName: 'Bitcoin Testnet',
} as const
