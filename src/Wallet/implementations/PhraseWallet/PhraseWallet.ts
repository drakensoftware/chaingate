import { Seed } from '../../entities/Secret/implementations/Seed'
import { SerializedWallet } from '../../Wallet'
import { SeedableWallet, SerializedSeedableWallet } from '../../abstract/SeedableWallet'
import { Encrypted } from '../../entities/WalletEncryption/Encrypted'
import { Phrase } from '../../entities/Secret/implementations/Phrase'
import { Encrypt } from '../../entities/WalletEncryption/WalletEncryption'
import { hexToBytes, recordToMap, transformMap } from '../../../InternalUtils/Utils'
import { ExtendedPublicKey } from '../../entities/Secret/implementations/ExtendedPublicKey'
import { Client } from '@hey-api/client-fetch'
import { TtlCache } from '../../../InternalUtils/TtlCache'
import { GlobalMarketsResponse } from '../../../Client'

export class PhraseWallet extends SeedableWallet {
    constructor(
        client: Client,
        markets: TtlCache<GlobalMarketsResponse>,
        secret: Phrase | Encrypted,
        askForPassword?: (attempts: number, reject: () => void) => Promise<string>,
    ) {
        super(client, markets, secret, askForPassword)
    }

    protected async serializeInternal(): Promise<SerializedWallet> {
        return await this.internalSerialize('phrase')
    }

    async getPhrase(): Promise<Phrase> {
        const phrase = new TextDecoder().decode(await this.walletEncryption.getSecretDecrypted())
        return new Phrase(phrase)
    }

    async getSeed(): Promise<Seed> {
        return (await this.getPhrase()).getSeed()
    }

    static async new(
        client: Client,
        markets: TtlCache<GlobalMarketsResponse>,
        phrase: string,
        warnAboutUnencrypted: boolean,
        encrypt?: Encrypt,
    ) {
        const newPhrase = await Phrase.new(phrase)
        const wallet = new PhraseWallet(client, markets, newPhrase, encrypt?.askForPassword)
        wallet.walletUniqueId = newPhrase.uniqueId

        await wallet.generateAllCurrencyDefaultDerivations()

        if (encrypt) await wallet.walletEncryption.encrypt(encrypt.password)
        wallet.walletEncryption.warnAboutUnencrypted = warnAboutUnencrypted

        return wallet
    }

    static async import(
        client: Client,
        markets: TtlCache<GlobalMarketsResponse>,
        serialized: SerializedSeedableWallet,
        askForPassword: (attempts: number, reject: () => void) => Promise<string>,
    ): Promise<PhraseWallet> {
        const encrypted = new Encrypted({
            iterations: serialized.secret.iterations,
            dkLen: serialized.secret.dkLen,
            nonce: hexToBytes(serialized.secret.nonce),
            salt: hexToBytes(serialized.secret.salt),
            data: hexToBytes(serialized.secret.data),
            cipher: serialized.secret.cipher,
        })

        if (!(serialized.walletType == 'phrase')) throw new Error('Wallet format error')

        const wallet = new PhraseWallet(client, markets, encrypted, askForPassword)
        wallet.walletUniqueId = serialized.walletUniqueId
        wallet.derivationPaths = recordToMap(serialized.derivationPaths)

        const derivationResultsStr = recordToMap(serialized.publicKeys)
        wallet.derivationResults = transformMap(
            derivationResultsStr,
            (t) => new ExtendedPublicKey(t),
        )

        return wallet
    }
}
