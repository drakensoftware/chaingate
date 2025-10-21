import {
    ArbitrumInfo,
    AvalancheInfo,
    BaseInfo,
    BitcoinCashInfo,
    BitcoinInfo,
    BitcoinTestnetInfo,
    BnbInfo,
    CurrencyInfo,
    DogecoinInfo,
    EthereumInfo,
    FantomInfo,
    LitecoinInfo,
    PolygonInfo,
} from './CurrencyInfo'
import { CurrencyUtils } from './CurrencyUtils/CurrencyUtils'
import { Transports } from './CurrencyWallet/Transports'
import { CurrencyWallet } from './CurrencyWallet/CurrencyWallet'
import {
    ArbitrumUtils,
    AvalancheUtils,
    BaseUtils,
    BitcoinCashUtils,
    BitcoinTestnetUtils,
    BitcoinUtils,
    BnbUtils,
    DogecoinUtils,
    EthereumUtils,
    FantomUtils,
    LitecoinUtils,
    PolygonUtils,
} from './CurrencyUtils'
import {
    ArbitrumWallet,
    AvalancheWallet,
    BaseWallet,
    BitcoinCashWallet,
    BitcoinTestnetWallet,
    BitcoinWallet,
    BnbWallet,
    DogecoinWallet,
    EthereumWallet,
    FantomWallet,
    LitecoinWallet,
    PolygonWallet,
} from './CurrencyWallet'
import { ChainGateContext } from './CurrencyUtils/ChainGateContext'

export const AllCurrencies = [
    'bitcoin',
    'bitcoinTestnet',
    'litecoin',
    'dogecoin',
    'bitcoinCash',
    'ethereum',
    'arbitrum',
    'avalanche',
    'base',
    'bnbChain',
    'fantom',
    'polygon',
] as const

type CurrencyModule<
    CI extends CurrencyInfo = CurrencyInfo,
    CU extends CurrencyUtils<CI> = CurrencyUtils<CI>,
    CW extends CurrencyWallet<CI> = CurrencyWallet<CI>,
> = {
    info: CI
    utils: new (context: ChainGateContext) => CU
    wallet: new (utils: CU, transports: Transports) => CW
}

export const CurrencyModules = {
    bitcoin: { info: BitcoinInfo, utils: BitcoinUtils, wallet: BitcoinWallet },
    bitcoinTestnet: {
        info: BitcoinTestnetInfo,
        utils: BitcoinTestnetUtils,
        wallet: BitcoinTestnetWallet,
    },
    litecoin: { info: LitecoinInfo, utils: LitecoinUtils, wallet: LitecoinWallet },
    dogecoin: { info: DogecoinInfo, utils: DogecoinUtils, wallet: DogecoinWallet },
    bitcoinCash: { info: BitcoinCashInfo, utils: BitcoinCashUtils, wallet: BitcoinCashWallet },
    ethereum: { info: EthereumInfo, utils: EthereumUtils, wallet: EthereumWallet },
    arbitrum: { info: ArbitrumInfo, utils: ArbitrumUtils, wallet: ArbitrumWallet },
    avalanche: { info: AvalancheInfo, utils: AvalancheUtils, wallet: AvalancheWallet },
    base: { info: BaseInfo, utils: BaseUtils, wallet: BaseWallet },
    bnbChain: { info: BnbInfo, utils: BnbUtils, wallet: BnbWallet },
    fantom: { info: FantomInfo, utils: FantomUtils, wallet: FantomWallet },
    polygon: { info: PolygonInfo, utils: PolygonUtils, wallet: PolygonWallet },
} as const satisfies Record<(typeof AllCurrencies)[number], CurrencyModule>

export function getCurrencyInfo(currency: (typeof AllCurrencies)[number]) {
    return CurrencyModules[currency].info
}
