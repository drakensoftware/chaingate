import {PhraseLanguage} from './Wallet/implementations/PhraseWallet/PhraseLanguage'
import {PhraseNumOfWords} from './Wallet/implementations/PhraseWallet/PhraseNumOfWords'
import {generateNewPhrase} from './Wallet/implementations/PhraseWallet/PhraseGenerator'
import {Phrase} from './Wallet/entities/Secret/implementations/Phrase'
import {PhraseWallet} from './Wallet/implementations/PhraseWallet/PhraseWallet'
import {ChainGateClient} from 'chaingate-client'
import {ChainGateKeystore} from './Wallet/abstract/LocalWallet/Keystore/ChainGateKeystore'
import {ExportedWalletData} from './Wallet/Wallet'
import {Seed} from './Wallet/entities/Secret/implementations/Seed'
import {SeedWallet} from './Wallet/implementations/SeedWallet/SeedWallet'
import {PrivateKey} from './Wallet/entities/Secret/implementations/PrivateKey'
import {ImportedPrivateKey} from './Wallet/implementations/ImportedPrivateKey/ImportedPrivateKey'
import {LegacyKeystore} from './Wallet/abstract/LocalWallet/Keystore/LegacyKeystore'
import {Web3Keystore} from './Wallet/abstract/LocalWallet/Keystore/Web3Keystore'
import {EncodingError, Encrypt} from './Wallet/abstract/LocalWallet/LocalWallet'
import {IncorrectPassword} from './Wallet/abstract/LocalWallet/Keystore/errors'

export type HDWalletExportedWalletData = {
    walletUniqueId: string
    knownPublicKeys?: Record<string, string>
    currenciesDerivationPaths?: Record<string, string>
}

export class InitializeWallet {
    async create({
        apiKey = '',
        phraseLanguage = 'english',
        phraseNumOfWords = 12,
        encrypt,
        warnAboutUnencrypted = true
    }: {
        apiKey?: string
        phraseLanguage?: PhraseLanguage
        phraseNumOfWords?: PhraseNumOfWords
        encrypt?: Encrypt,
        warnAboutUnencrypted?: boolean
    } = {}) {
        const phrase = generateNewPhrase(phraseLanguage, phraseNumOfWords)
        const secret = new Phrase(phrase)

        let wallet
        if(encrypt) wallet = await PhraseWallet.new(
            new ChainGateClient(apiKey),
            secret,
            warnAboutUnencrypted,
            encrypt
        )
        else wallet = await PhraseWallet.new(new ChainGateClient(apiKey), secret, warnAboutUnencrypted)

        return { phrase, wallet }
    }


    async fromPhrase({
        apiKey = '',
        phrase,
        exportedWalletData,
        encrypt,
        warnAboutUnencrypted = true
    }: {
        apiKey?: string
        phrase: string
        exportedWalletData?: ExportedWalletData
        encrypt?: Encrypt
        warnAboutUnencrypted?: boolean
    }) {
        const secret = await Phrase.fromString(phrase)

        return PhraseWallet.new(
            new ChainGateClient(apiKey),
            secret,
            warnAboutUnencrypted,
            encrypt,
            exportedWalletData
        )
    }

    async fromSeed({
        apiKey = '',
        seed,
        exportedWalletData,
        encrypt,
        warnAboutUnencrypted = true
    }: {
        apiKey?: string
        seed: string | Uint8Array
        exportedWalletData?: ExportedWalletData
        encrypt?: Encrypt,
        warnAboutUnencrypted?: boolean
    }) {
        let secret
        if(seed instanceof Uint8Array) secret = Seed.fromBytes(seed)
        else secret = Seed.fromString(seed)

        return SeedWallet.new(
            new ChainGateClient(apiKey),
            secret,
            warnAboutUnencrypted,
            encrypt,
            exportedWalletData
        )
    }

    async fromPrivateKey({
        apiKey = '',
        privateKey,
        exportedWalletData,
        encrypt,
        warnAboutUnencrypted = true
    }: {
        apiKey?: string
        privateKey: string | Uint8Array
        exportedWalletData?: ExportedWalletData
        encrypt?: Encrypt
        warnAboutUnencrypted?: boolean
    }) {
        let secret
        if(privateKey instanceof Uint8Array) secret = PrivateKey.fromBytes(privateKey)
        else secret = PrivateKey.fromString(privateKey)

        return await ImportedPrivateKey.new(
            new ChainGateClient(apiKey),
            secret,
            warnAboutUnencrypted,
            encrypt,
            exportedWalletData
        )
    }

    async fromKeystore({
        apiKey = '',
        keystore,
        password,
        exportedWalletData,
        encrypt,
        warnAboutUnencrypted = true
    }: {
        apiKey?: string
        keystore: string
        password: string
        exportedWalletData?: ExportedWalletData
        encrypt?: Encrypt
        warnAboutUnencrypted?: boolean
    }) {
        try {
            const obj = JSON.parse(keystore)
            let secret

            if(LegacyKeystore.isKeystore(obj)) secret = await new LegacyKeystore(obj).decrypt(password)
            else if(Web3Keystore.isKeystore(obj)) secret = await new Web3Keystore(obj).decrypt(password)
            else throw new EncodingError('Invalid keystore')


            return this.walletFromSecret(secret, apiKey, warnAboutUnencrypted, encrypt, exportedWalletData)
        } catch (ex) {
            if (ex instanceof IncorrectPassword) throw ex
            throw new EncodingError('Invalid keystore')
        }
    }

    async fromExportedKeys({
        apiKey = '',
        keystore,
        password,
        exportedWalletData,
        encrypt,
        warnAboutUnencrypted = true
    }: {
        apiKey?: string
        keystore: string
        password: string
        exportedWalletData?: ExportedWalletData
        encrypt?: Encrypt
        warnAboutUnencrypted?: boolean
    }) {
        try {
            const obj = JSON.parse(keystore)
            if (!ChainGateKeystore.isKeystore(obj)) throw new EncodingError('Invalid keystore')
            const secret = await new ChainGateKeystore(obj).decrypt(password)

            return this.walletFromSecret(secret, apiKey, warnAboutUnencrypted, encrypt, exportedWalletData)
        } catch (ex) {
            if (ex instanceof IncorrectPassword) throw ex
            throw new EncodingError('Invalid keystore')
        }
    }

    async walletFromSecret(
        secret: Phrase | Seed | PrivateKey,
        apiKey: string,
        warnAboutUnencrypted : boolean,
        encrypt?: Encrypt,
        exportedWalletData?: ExportedWalletData) {

        if(secret instanceof Seed) {
            return await SeedWallet.new(
                new ChainGateClient(apiKey),
                secret,
                warnAboutUnencrypted,
                encrypt,
                exportedWalletData
            )
        }

        if(secret instanceof PrivateKey) {
            return await ImportedPrivateKey.new(
                new ChainGateClient(apiKey),
                secret,
                warnAboutUnencrypted,
                encrypt,
                exportedWalletData
            )
        }

        if(secret instanceof Phrase) {
            return await PhraseWallet.new(
                new ChainGateClient(apiKey),
                secret,
                warnAboutUnencrypted,
                encrypt,
                exportedWalletData
            )
        }
    }

}
