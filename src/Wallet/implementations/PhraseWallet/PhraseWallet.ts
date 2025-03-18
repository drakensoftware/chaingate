import {Seed} from '../../entities/Secret/implementations/Seed'
import {SerializedWallet} from '../../Wallet'
import {SerializedSeedableWallet, SeedableWallet} from '../../abstract/SeedableWallet'
import {ChainGateClient} from 'chaingate-client'
import {Encrypted} from '../../entities/WalletEncryption/Encrypted'
import {Phrase} from '../../entities/Secret/implementations/Phrase'
import {Encrypt} from '../../entities/WalletEncryption/WalletEncryption'
import {hexToBytes, recordToMap, transformMap} from '../../../Utils/Utils'
import {ExtendedPublicKey} from '../../entities/Secret/implementations/ExtendedPublicKey'


export class PhraseWallet extends SeedableWallet{
    constructor(apiClient: ChainGateClient, secret: Phrase | Encrypted, askForPassword?: (attempts: number, reject: () => void) => Promise<string>) {
        super(apiClient, secret, askForPassword)
    }

    protected async serializeInternal(): Promise<SerializedWallet> {
        return await this.internalSerialize('phrase')
    }

    async getPhrase(): Promise<Phrase>{
        const phrase = (new TextDecoder()).decode(await this.walletEncryption.getSecretDecrypted())
        return new Phrase(phrase)
    }

    async getSeed(): Promise<Seed> {
        return (await this.getPhrase()).getSeed()
    }

    static async new(apiKey: string, phrase: string, warnAboutUnencrypted: boolean, encrypt?: Encrypt) {
        const chainGateClient = new ChainGateClient(apiKey)
        const newPhrase = await Phrase.new(phrase)
        const wallet = new PhraseWallet(chainGateClient, newPhrase, encrypt?.askForPassword)
        wallet.walletUniqueId = newPhrase.uniqueId

        await wallet.generateAllCurrencyDefaultDerivations()

        if(encrypt) await wallet.walletEncryption.encrypt(encrypt.password)
        wallet.walletEncryption.warnAboutUnencrypted = warnAboutUnencrypted

        return wallet
    }

    static async import(apiKey: string, serialized: SerializedSeedableWallet, askForPassword: (attempts: number, reject: () => void) => Promise<string>) : Promise<PhraseWallet>{
        const encrypted = new Encrypted({
            iterations: serialized.secret.iterations,
            dkLen: serialized.secret.dkLen,
            nonce: hexToBytes(serialized.secret.nonce),
            salt: hexToBytes(serialized.secret.salt),
            data: hexToBytes(serialized.secret.data),
            cipher: serialized.secret.cipher
        })

        if(!(serialized.walletType == 'phrase')) throw new Error('Wallet format error')

        const wallet = new PhraseWallet(new ChainGateClient(apiKey), encrypted, askForPassword)
        wallet.walletUniqueId = serialized.walletUniqueId
        wallet.derivationPaths = recordToMap(serialized.derivationPaths)

        const derivationResultsStr = recordToMap(serialized.publicKeys)
        wallet.derivationResults = transformMap(derivationResultsStr, (t) => new ExtendedPublicKey(t))

        return wallet
    }
}
