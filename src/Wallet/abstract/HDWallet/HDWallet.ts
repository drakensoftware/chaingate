import {LocalWallet} from '../LocalWallet/LocalWallet'
import {ChainGateClient} from 'chaingate-client'
import {Seed} from '../../entities/Secret/implementations/Seed'
import {
    CurrencyWithDerivationPaths,
    ICurrencyWithDerivationPaths
} from './CurrencyWithDerivationPaths'
import {AllCurrencies, Currencies, CurrencyMap, ExportedWalletData} from '../../Wallet'
import {Phrase} from '../../entities/Secret/implementations/Phrase'
import {HDPrivateKeySign} from '../../entities/Currency/CurrencyParams'
import {CurrencyInfo} from '../../entities/Currency/CurrencyInfo'
import {Arbitrum} from '../../entities/Currency/implementations/Arbitrum'
import {Avalanche} from '../../entities/Currency/implementations/Avalanche'
import {Base} from '../../entities/Currency/implementations/Base'
import {BNBChain} from '../../entities/Currency/implementations/BNBChain'
import {Ethereum} from '../../entities/Currency/implementations/Ethereum/Ethereum'
import {FantomOpera} from '../../entities/Currency/implementations/FantomOpera'
import {Polygon} from '../../entities/Currency/implementations/Polygon'
import {Bitcoin} from '../../entities/Currency/implementations/Bitcoin/Bitcoin'
import {BitcoinTestnet} from '../../entities/Currency/implementations/BitcoinTestnet/BitcoinTestnet'
import {Dogecoin} from '../../entities/Currency/implementations/Dogecoin/Dogecoin'
import {Litecoin} from '../../entities/Currency/implementations/Litecoin/Litecoin'
import {BitcoinCash} from '../../entities/Currency/implementations/BitcoinCash/BitcoinCash'
import {ExtendedPublicKey} from '../../entities/Secret/ExtendedPublicKey'


export abstract class HDWallet<Secret extends Phrase | Seed> extends LocalWallet<Secret, AllCurrencies> {
    declare currencyParams: HDPrivateKeySign
    abstract getSeed(): Promise<Seed>

    private readonly knownExtendedPublicKeys : Map<string, ExtendedPublicKey>
    private readonly currenciesDerivationPaths: Map<string, string>

    protected constructor(apiClient: ChainGateClient, secret: Secret, exportedWalletData?: ExportedWalletData) {
        const currencyParams : HDPrivateKeySign = {
            signMode: 'hdPrivateKey',
            getPublicKey: async (derivationPath) => {
                return await this.getPublicKey(derivationPath)
            },
            getPrivateKey: async (derivationPath) => {
                return await this.getPrivateKey(derivationPath)
            },
            getDerivationPath: (currencyInfo) => {
                return this.getDerivationPath(currencyInfo)
            }
        }

        super(apiClient, currencyParams, secret)

        if(exportedWalletData?.knownPublicKeys){
            this.knownExtendedPublicKeys = recordToMap(Object.entries(exportedWalletData.knownPublicKeys).reduce(
                (acc, [currencyId, xpub]) => {
                    acc[currencyId] = ExtendedPublicKey.fromXPub(xpub)
                    return acc
                },
                {} as Record<string, ExtendedPublicKey>
            ))
        }else{
            this.knownExtendedPublicKeys = new Map<string, ExtendedPublicKey>()
        }

        if(exportedWalletData?.currenciesDerivationPaths){
            this.currenciesDerivationPaths = recordToMap(exportedWalletData.currenciesDerivationPaths)
        }else{
            this.currenciesDerivationPaths = new Map<string, string>()
        }
    }

    protected async derivePublicKeys() {
        // Create a Set to store unique derivation paths
        const allDerivationPaths = new Set<string>()

        // Gather all derivation paths from each currency
        for (const currency of this.allCurrencies) {
            for (const derivationPath of currency.currencyInfo.commonDerivationPaths) {
                allDerivationPaths.add(derivationPath)
            }
        }

        // Now iterate over the aggregated unique derivation paths
        for (const derivationPath of allDerivationPaths) {
            if (!this.knownExtendedPublicKeys.has(derivationPath)) {
                const seed = await this.getSeed()
                const extendedPublicKey = await seed.getExtendedPublicKey(derivationPath)
                this.knownExtendedPublicKeys.set(derivationPath, extendedPublicKey)
            }
        }
    }

    private setDerivationPath(currencyInfo: CurrencyInfo, derivationPath: string){
        return this.currenciesDerivationPaths.set(currencyInfo.id, derivationPath)
    }

    private getDerivationPath(currencyInfo: CurrencyInfo){
        return this.currenciesDerivationPaths.get(currencyInfo.id) ?? currencyInfo.defaultDerivationPath
    }

    private async getPublicKey(derivationPath: string){
        // Extract public key from knownExtendedPublicKeys
        if (this.knownExtendedPublicKeys.has(derivationPath)) return this.knownExtendedPublicKeys.get(derivationPath)

        // Extract public key deriving from private key
        const publicKey = await (await this.getSeed()).getExtendedPublicKey(derivationPath)
        this.knownExtendedPublicKeys.set(derivationPath, publicKey)

        return publicKey
    }

    private async getPrivateKey(derivationPath: string){
        return await (await this.getSeed()).getExtendedPrivateKey(derivationPath)
    }

    public override currency<T extends AllCurrencies>(currency: T) {
        const currencyMap: CurrencyMap = {
            'arbitrum': CurrencyWithDerivationPaths(new Arbitrum(this.apiClient.ArbitrumApi, this.currencyParams), this.currenciesDerivationPaths, this.getPrivateKey, this.getPublicKey),
            'avalanche': CurrencyWithDerivationPaths(new Avalanche(this.apiClient.AvalancheApi, this.currencyParams), this.currenciesDerivationPaths, this.getPrivateKey, this.getPublicKey),
            'base': CurrencyWithDerivationPaths(new Base(this.apiClient.BaseApi, this.currencyParams), this.currenciesDerivationPaths, this.getPrivateKey, this.getPublicKey),
            'bnbChain': CurrencyWithDerivationPaths(new BNBChain(this.apiClient.BNBChainApi, this.currencyParams), this.currenciesDerivationPaths, this.getPrivateKey, this.getPublicKey),
            'ethereum': CurrencyWithDerivationPaths(new Ethereum(this.apiClient.EthereumApi, this.currencyParams), this.currenciesDerivationPaths, this.getPrivateKey, this.getPublicKey),
            'fantomOpera': CurrencyWithDerivationPaths(new FantomOpera(this.apiClient.FantomOperaApi, this.currencyParams), this.currenciesDerivationPaths, this.getPrivateKey, this.getPublicKey),
            'polygon': CurrencyWithDerivationPaths(new Polygon(this.apiClient.PolygonApi, this.currencyParams), this.currenciesDerivationPaths, this.getPrivateKey, this.getPublicKey),
            'bitcoin': CurrencyWithDerivationPaths(new Bitcoin(this.apiClient.BitcoinApi, this.currencyParams), this.currenciesDerivationPaths, this.getPrivateKey, this.getPublicKey),
            'bitcoinTestnet': CurrencyWithDerivationPaths(new BitcoinTestnet(this.apiClient.BitcoinTestnetApi, this.currencyParams), this.currenciesDerivationPaths, this.getPrivateKey, this.getPublicKey),
            'dogecoin': CurrencyWithDerivationPaths(new Dogecoin(this.apiClient.DogecoinApi, this.currencyParams), this.currenciesDerivationPaths, this.getPrivateKey, this.getPublicKey),
            'litecoin': CurrencyWithDerivationPaths(new Litecoin(this.apiClient.LitecoinApi, this.currencyParams), this.currenciesDerivationPaths, this.getPrivateKey, this.getPublicKey),
            'bitcoinCash': CurrencyWithDerivationPaths(new BitcoinCash(this.apiClient.BitcoinCashApi, this.currencyParams), this.currenciesDerivationPaths, this.getPrivateKey, this.getPublicKey)
        }

        return currencyMap[currency] as CurrencyMap[T] & ICurrencyWithDerivationPaths
    }

    public async exportWalletData(): Promise<ExportedWalletData> {
        return {
            walletUniqueId: await this.getWalletUniqueId(),
            currenciesDerivationPaths: mapToRecord(this.currenciesDerivationPaths),
            knownExtendedPublicKeys: mapToRecord(new Map(
                Array.from(this.knownExtendedPublicKeys, ([key, value]) => [key, value.xpub])
            ))
        }
    }

    protected supportedCurrencies: AllCurrencies[] = Currencies
}


function recordToMap<K extends string, V>(record: Record<K, V>): Map<K, V> {
    // Convert record to an array of [key, value] pairs, then pass to new Map
    return new Map<K, V>(Object.entries(record) as [K, V][])
}

function mapToRecord<K extends string, V>(map: Map<K, V>): Record<K, V> {
    const record: Record<K, V> = {} as Record<K, V>
    for (const [key, value] of map) {
        record[key] = value
    }
    return record
}

