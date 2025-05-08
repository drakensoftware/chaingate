import {ChainGateClient} from 'chaingate-client'
import {Seed} from '../../entities/Secret/implementations/Seed'
import {CurrencyWithDerivationPaths, ICurrencyWithDerivationPaths} from './CurrencyWithDerivationPaths'
import {AllCurrencies, CurrencyMap, Wallet} from '../../Wallet'
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
import {CurrencyProviders} from '../../entities/Currency/CurrencyProviders'


export abstract class HDWallet<DerivationResult, SupportedCurrencies extends AllCurrencies> extends Wallet<SupportedCurrencies> {
    abstract getSeed(): Promise<Seed>

    protected derivationPaths: Map<string, string>
    protected derivationResults : Map<string, DerivationResult>

    protected constructor(apiClient: ChainGateClient,
        currencyProviders: CurrencyProviders
    ) {
        super(apiClient, currencyProviders)

        this.derivationPaths = new Map<string, string>()
        this.derivationResults = new Map<string, DerivationResult>
    }

    protected abstract deriveFromPath(derivationPath: string): Promise<DerivationResult>
    protected async deriveFromPathUsingCache(derivationPath: string): Promise<DerivationResult> {
        let result = this.derivationResults.get(derivationPath)
        if (!result) {
            result = await this.deriveFromPath(derivationPath)
            this.derivationResults.set(derivationPath, result)
        }
        return result
    }

    protected async generateAllCurrencyDefaultDerivations(){
        for(const currency of this.allCurrencies){
            await this.deriveFromPathUsingCache(currency.currencyInfo.defaultDerivationPath)
            for(const derivationPath of currency.currencyInfo.commonDerivationPaths)
                await this.deriveFromPathUsingCache(derivationPath)
        }
    }

    protected setDerivationPath(currencyInfo: CurrencyInfo, derivationPath: string){
        return this.derivationPaths.set(currencyInfo.id, derivationPath)
    }

    protected getDerivationPath(currencyInfo: CurrencyInfo){
        return this.derivationPaths.get(currencyInfo.id) ?? currencyInfo.defaultDerivationPath
    }

    public override currency<T extends AllCurrencies>(currency: T) {
        const currencyMap: CurrencyMap = {
            'arbitrum': CurrencyWithDerivationPaths(new Arbitrum(this.client, this.client.ArbitrumApi, this.currencyProviders), this.derivationPaths),
            'avalanche': CurrencyWithDerivationPaths(new Avalanche(this.client, this.client.AvalancheApi, this.currencyProviders), this.derivationPaths),
            'base': CurrencyWithDerivationPaths(new Base(this.client, this.client.BaseApi, this.currencyProviders), this.derivationPaths),
            'bnbChain': CurrencyWithDerivationPaths(new BNBChain(this.client, this.client.BNBChainApi, this.currencyProviders), this.derivationPaths),
            'ethereum': CurrencyWithDerivationPaths(new Ethereum(this.client, this.client.EthereumApi, this.currencyProviders), this.derivationPaths),
            'fantomOpera': CurrencyWithDerivationPaths(new FantomOpera(this.client, this.client.FantomOperaApi, this.currencyProviders), this.derivationPaths),
            'polygon': CurrencyWithDerivationPaths(new Polygon(this.client, this.client.PolygonApi, this.currencyProviders), this.derivationPaths),
            'bitcoin': CurrencyWithDerivationPaths(new Bitcoin(this.client, this.client.BitcoinApi, this.currencyProviders), this.derivationPaths),
            'bitcoinTestnet': CurrencyWithDerivationPaths(new BitcoinTestnet(this.client, this.client.BitcoinTestnetApi, this.currencyProviders), this.derivationPaths),
            'dogecoin': CurrencyWithDerivationPaths(new Dogecoin(this.client, this.client.DogecoinApi, this.currencyProviders), this.derivationPaths),
            'litecoin': CurrencyWithDerivationPaths(new Litecoin(this.client, this.client.LitecoinApi, this.currencyProviders), this.derivationPaths),
            'bitcoinCash': CurrencyWithDerivationPaths(new BitcoinCash(this.client, this.client.BitcoinCashApi, this.currencyProviders), this.derivationPaths)
        }

        return currencyMap[currency] as CurrencyMap[T] & ICurrencyWithDerivationPaths
    }
}
