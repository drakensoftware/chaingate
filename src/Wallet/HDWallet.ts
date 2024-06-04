import {Seed} from './Keys/Seed'
import {Wallet} from './Wallet'
import {ChainGateClient} from 'chaingate-client'
import {DefaultCurrencies} from './Currencies/Currencies'

export class HDWallet extends Wallet {
    get Seed(): Seed {
        return this.privateKeySource as Seed
    }

    private constructor(chainGateClient: ChainGateClient, seed: Seed, currencies: DefaultCurrencies) {
        super(chainGateClient, seed, currencies)
    }

    static async new(chainGateClient: ChainGateClient, seed: Seed) {
        const currencies = new DefaultCurrencies(chainGateClient, seed)
        for (const currency of currencies.all) await currency.initializePublicKey()
        seed.enableRunningUnencryptedMessage = true
        return new HDWallet(chainGateClient, seed, currencies)
    }
}
