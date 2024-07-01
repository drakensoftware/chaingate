import {Currency} from './Currency'
import {PrivateKeySource} from '../Keys'
import {Bitcoin} from './Bitcoin'
import {ChainGateClient} from 'chaingate-client'
import {Arbitrum, Avalanche, BinanceSmartChain, Boba, Ethereum, Polygon} from './Evm'

export abstract class Currencies {
    public all: ReadonlyArray<Currency>
}

export class DefaultCurrencies extends Currencies {
    readonly arbitrum
    readonly avalanche
    readonly binanceSmartChain
    readonly bitcoin
    readonly boba
    readonly ethereum
    readonly polygon


    constructor(chainGateClient: ChainGateClient, privateKeySource: PrivateKeySource) {
        super()


        this.arbitrum = new Arbitrum(chainGateClient.ArbitrumApi, privateKeySource)
        this.avalanche = new Avalanche(chainGateClient.AvalancheApi, privateKeySource)
        this.binanceSmartChain = new BinanceSmartChain(chainGateClient.BinanceSmartChainApi, privateKeySource)
        this.bitcoin = new Bitcoin(chainGateClient.Bitcoin, privateKeySource)
        this.boba = new Boba(chainGateClient.BobaNetworkApi, privateKeySource)
        this.ethereum = new Ethereum(chainGateClient.Ethereum, privateKeySource)
        this.polygon = new Polygon(chainGateClient.PolygonApi, privateKeySource)

        this.all = [this.bitcoin, this.ethereum]
    }
}
