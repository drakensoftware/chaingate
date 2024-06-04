import {Phrase} from './Keys'
import {ChainGateClient} from 'chaingate-client'
import {DefaultCurrencies} from './Currencies/Currencies'
import {Wallet} from './Wallet'

export class PhraseWallet extends Wallet {

    async getSeed() {
        return await (this.privateKeySource as Phrase).getSeed()
    }

    get Phrase(): string {
        return (this.privateKeySource as Phrase).phrase
    }

    private constructor(chainGateClient: ChainGateClient, phrase: Phrase, currencies: DefaultCurrencies) {
        super(chainGateClient, phrase, currencies)
    }

    static async new(chainGateClient: ChainGateClient, phrase: Phrase) {
        const currencies = new DefaultCurrencies(chainGateClient, phrase)
        for (const currency of currencies.all) await currency.initializePublicKey()
        phrase.enableRunningUnencryptedMessage = true
        return new PhraseWallet(chainGateClient, phrase, currencies)
    }
}
