import {Currency} from './Currency'
import {PrivateKeySource} from '../Keys'
import {Bitcoin} from './Bitcoin'
import {Ethereum} from './Ethereum'
import {ChainGateClient} from 'chaingate-client'

export abstract class Currencies {
    public all: ReadonlyArray<Currency>
}

export class DefaultCurrencies extends Currencies {
    readonly bitcoin: Bitcoin
    readonly ethereum: Ethereum

    constructor(chainGateClient: ChainGateClient, privateKeySource: PrivateKeySource) {
        super()

        this.bitcoin = new Bitcoin(chainGateClient, privateKeySource)
        this.ethereum = new Ethereum(chainGateClient, privateKeySource)

        this.all = [this.bitcoin, this.ethereum]
    }
}
