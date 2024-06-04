import {PrivateKey} from './Keys'
import {ChainGateClient} from 'chaingate-client'
import {DefaultCurrencies} from './Currencies/Currencies'
import {Wallet} from './Wallet'

export class ImportedPrivateKey extends Wallet {
    get PrivateKey(): PrivateKey {
        return this.privateKeySource as PrivateKey
    }

    private constructor(chainGateClient: ChainGateClient, privateKey: PrivateKey, currencies: DefaultCurrencies) {
        super(chainGateClient, privateKey, currencies)
    }

    static async new(chainGateClient: ChainGateClient, privateKey: PrivateKey) {
        const currencies = new DefaultCurrencies(chainGateClient, privateKey)
        for (const currency of currencies.all) await currency.initializePublicKey()
        privateKey.enableRunningUnencryptedMessage = true
        return new ImportedPrivateKey(chainGateClient, privateKey, currencies)
    }
}
