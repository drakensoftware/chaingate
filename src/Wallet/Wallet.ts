import {ChainGateClient} from 'chaingate-client'
import {Arbitrum} from './entities/Currency/implementations/Arbitrum'
import {Avalanche} from './entities/Currency/implementations/Avalanche'
import {Base} from './entities/Currency/implementations/Base'
import {BNBChain} from './entities/Currency/implementations/BNBChain'
import {Ethereum} from './entities/Currency/implementations/Ethereum/Ethereum'
import {Sonic} from './entities/Currency/implementations/Sonic'
import {Polygon} from './entities/Currency/implementations/Polygon'
import {Bitcoin} from './entities/Currency/implementations/Bitcoin/Bitcoin'
import {BitcoinTestnet} from './entities/Currency/implementations/BitcoinTestnet/BitcoinTestnet'
import {Dogecoin} from './entities/Currency/implementations/Dogecoin/Dogecoin'
import {Litecoin} from './entities/Currency/implementations/Litecoin/Litecoin'
import {BitcoinCash} from './entities/Currency/implementations/BitcoinCash/BitcoinCash'
import {CurrencyProviders} from './entities/Currency/CurrencyProviders'
import {Currency} from './entities/Currency/Currency'
import {MarketsProvider} from '../MarketsProvider'

export type SerializedWallet = {
    format: 'ChainGate Serialize Wallet Format Version 2'
    walletType: string
    walletUniqueId: string
}

export const EvmCurrencies = [
    'arbitrum', 'avalanche', 'base',
    'bnbChain', 'ethereum', 'sonic',
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
    'sonic': Sonic,
    'polygon': Polygon,
    'bitcoin': Bitcoin,
    'bitcoinTestnet': BitcoinTestnet,
    'dogecoin': Dogecoin,
    'litecoin': Litecoin,
    'bitcoinCash': BitcoinCash
};

export abstract class Wallet<SupportedCurrencies extends AllCurrencies> {
    public readonly client: ChainGateClient
    protected readonly currencyProviders: CurrencyProviders
    protected readonly marketsProvider: MarketsProvider

    protected abstract supportedCurrencies: readonly SupportedCurrencies[]

    protected constructor(client: ChainGateClient, currencyProviders: CurrencyProviders) {
        this.client = client
        this.currencyProviders = currencyProviders
    }

    public abstract currency<T extends SupportedCurrencies>(currency: T): CurrencyMap[T]

    public get allCurrencies(): Currency[] {
        return this.supportedCurrencies.map((currency) => this.currency(currency))
    }

    abstract getWalletUniqueId(): Promise<string>

    protected abstract serializeInternal(): Promise<SerializedWallet>
    async serialize(){
        return JSON.stringify(await this.serializeInternal())
    }

    /**
     * Retrieves the balances for all supported currencies.
     *
     * @returns A promise that resolves to an array of currency balances.
     */
    async getAllBalances(){
        return await Promise.all(
            this.allCurrencies.map(async (currency) => ({
                currency: currency.currencyInfo,
                balance: await currency.getBalance()
            }))
        )
    }

    static isSerializedWallet(serialized: object){
        if(!('format' in serialized)) return false
        if(serialized.format != 'ChainGate Serialize Wallet Format Version 2') return false
        if(!('walletType' in serialized)) return false
        if(!('walletUniqueId' in serialized)) return false

        return true
    }
}
