import {ChainGateClient} from 'chaingate-client'
import {Arbitrum} from './entities/Currency/implementations/Arbitrum'
import {Avalanche} from './entities/Currency/implementations/Avalanche'
import {Base} from './entities/Currency/implementations/Base'
import {BNBChain} from './entities/Currency/implementations/BNBChain'
import {Ethereum} from './entities/Currency/implementations/Ethereum/Ethereum'
import {FantomOpera} from './entities/Currency/implementations/FantomOpera'
import {Polygon} from './entities/Currency/implementations/Polygon'
import {Bitcoin} from './entities/Currency/implementations/Bitcoin/Bitcoin'
import {BitcoinTestnet} from './entities/Currency/implementations/BitcoinTestnet/BitcoinTestnet'
import {Dogecoin} from './entities/Currency/implementations/Dogecoin/Dogecoin'
import {Litecoin} from './entities/Currency/implementations/Litecoin/Litecoin'
import {BitcoinCash} from './entities/Currency/implementations/BitcoinCash/BitcoinCash'
import {CurrencyParams} from './entities/Currency/CurrencyParams'
import {Currency} from './entities/Currency/Currency'

export type ExportedWalletData = {
    walletUniqueId: string
    knownPublicKeys?: Record<string, string>
    knownExtendedPublicKeys?: Record<string, string>
    currenciesDerivationPaths?: Record<string, string>,
    publicKey?: string
}

export const EvmCurrencies = [
    'arbitrum', 'avalanche', 'base',
    'bnbChain', 'ethereum', 'fantomOpera',
    'polygon'
] as const
export const UtxoCurrencies = [
    'bitcoin', 'bitcoinTestnet', 'dogecoin', 'litecoin', 'bitcoinCash'
] as const
export const Currencies = [...EvmCurrencies, ...UtxoCurrencies]

export type EvmCurrencies = typeof EvmCurrencies[number]
export type UtxoCurrencies = typeof UtxoCurrencies[number]
export type AllCurrencies = EvmCurrencies | UtxoCurrencies // Union type for all currencies

export type CurrencyMap = {
    'arbitrum': Arbitrum,
    'avalanche': Avalanche,
    'base': Base,
    'bnbChain': BNBChain,
    'ethereum': Ethereum,
    'fantomOpera': FantomOpera,
    'polygon': Polygon,
    'bitcoin': Bitcoin,
    'bitcoinTestnet': BitcoinTestnet,
    'dogecoin': Dogecoin,
    'litecoin': Litecoin,
    'bitcoinCash': BitcoinCash
};

export abstract class Wallet<SupportedCurrencies extends AllCurrencies> {
    public readonly apiClient: ChainGateClient
    protected readonly currencyParams: CurrencyParams

    protected abstract supportedCurrencies: readonly SupportedCurrencies[]

    protected constructor(apiClient: ChainGateClient, currencyParams: CurrencyParams) {
        this.apiClient = apiClient
        this.currencyParams = currencyParams
    }

    public abstract currency<T extends SupportedCurrencies>(currency: T): CurrencyMap[T]

    public get allCurrencies(): Currency[] {
        return this.supportedCurrencies.map((currency) => this.currency(currency))
    }

    abstract getWalletUniqueId(): Promise<string>
    abstract exportWalletData(): Promise<ExportedWalletData>
}
