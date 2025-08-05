import { PhraseLanguage } from './Wallet/implementations/PhraseWallet/PhraseLanguage'
import { PhraseNumOfWords } from './Wallet/implementations/PhraseWallet/PhraseNumOfWords'
import { generateNewPhrase } from './Wallet/implementations/PhraseWallet/PhraseGenerator'
import { Phrase } from './Wallet/entities/Secret/implementations/Phrase'
import { PhraseWallet } from './Wallet/implementations/PhraseWallet/PhraseWallet'
import { SerializedWallet, Wallet } from './Wallet/Wallet'
import { SeedWallet } from './Wallet/implementations/SeedWallet/SeedWallet'
import {
    PrivateKeyWallet,
    SerializedPrivateKeyWallet,
} from './Wallet/implementations/PrivateKeyWallet/PrivateKeyWallet'
import { LegacyKeystore } from './Wallet/entities/Keystore/LegacyKeystore'
import { Web3Keystore } from './Wallet/entities/Keystore/Web3Keystore'
import { IncorrectPassword } from './Wallet/entities/Keystore/errors'
import { EncodingError, Encrypt } from './Wallet/entities/WalletEncryption/WalletEncryption'
import { SerializedSeedableWallet } from './Wallet/abstract/SeedableWallet'
import { Seed } from './Wallet/entities/Secret/implementations/Seed'
import { PrivateKey } from './Wallet/entities/Secret/implementations/PrivateKey'
import { createClient, createConfig } from '@hey-api/client-fetch'
import { ClientOptions, globalMarkets, GlobalMarketsResponse } from './Client'
import { TtlCache } from './InternalUtils/TtlCache'

export { PhraseLanguage, PhraseNumOfWords }

export function createClientAndMarkets(apiKey: string) {
    const client = createClient(
        createConfig<ClientOptions>({
            baseUrl: 'https://api.chaingate.dev',
            headers: { 'x-api-key': apiKey },
            throwOnError: true,
        }),
    )

    const markets = new TtlCache<GlobalMarketsResponse>(
        () =>
            globalMarkets({ client }).then((r) => {
                if (r.error || !r.data) throw r.error ?? new Error('No data')
                return r.data
            }),
        30,
    )
    return { client, markets }
}

export async function create({
    apiKey = '',
    phraseLanguage = 'english',
    phraseNumOfWords = 12,
    encrypt,
    warnAboutUnencrypted = true,
}: {
    apiKey?: string
    phraseLanguage?: PhraseLanguage
    phraseNumOfWords?: PhraseNumOfWords
    encrypt?: Encrypt
    warnAboutUnencrypted?: boolean
} = {}) {
    const client = createClientAndMarkets(apiKey)
    const phrase = generateNewPhrase(phraseLanguage, phraseNumOfWords)

    let wallet
    if (encrypt)
        wallet = await PhraseWallet.new(
            client.client,
            client.markets,
            phrase,
            warnAboutUnencrypted,
            encrypt,
        )
    else
        wallet = await PhraseWallet.new(client.client, client.markets, phrase, warnAboutUnencrypted)

    return { phrase, wallet }
}

export async function fromPhrase({
    apiKey = '',
    phrase,
    encrypt,
    warnAboutUnencrypted = true,
}: {
    apiKey?: string
    phrase: string
    encrypt?: Encrypt
    warnAboutUnencrypted?: boolean
}) {
    const client = createClientAndMarkets(apiKey)
    return PhraseWallet.new(client.client, client.markets, phrase, warnAboutUnencrypted, encrypt)
}

export async function checkPhrase(phrase: string) {
    try {
        Phrase.isValidPhrase(phrase)
        return true
    } catch (_ex) {
        return false
    }
}

export async function fromSeed({
    apiKey = '',
    seed,
    encrypt,
    warnAboutUnencrypted = true,
}: {
    apiKey?: string
    seed: string | Uint8Array
    encrypt?: Encrypt
    warnAboutUnencrypted?: boolean
}) {
    const client = createClientAndMarkets(apiKey)
    return SeedWallet.new(client.client, client.markets, seed, warnAboutUnencrypted, encrypt)
}

export async function checkSeed(seed: string | Uint8Array) {
    try {
        new Seed(seed)
        return true
    } catch (_ex) {
        return false
    }
}

export async function fromPrivateKey({
    apiKey = '',
    privateKey,
    encrypt,
    warnAboutUnencrypted = true,
}: {
    apiKey?: string
    privateKey: string | Uint8Array
    encrypt?: Encrypt
    warnAboutUnencrypted?: boolean
}) {
    const client = createClientAndMarkets(apiKey)
    return await PrivateKeyWallet.new(
        client.client,
        client.markets,
        privateKey,
        warnAboutUnencrypted,
        encrypt,
    )
}

export async function checkPrivateKey(privateKey: string | Uint8Array) {
    try {
        new PrivateKey(privateKey)
        return true
    } catch (_ex) {
        return false
    }
}

export async function fromKeystore({
    apiKey = '',
    keystore,
    password,
    encrypt,
    warnAboutUnencrypted = true,
}: {
    apiKey?: string
    keystore: string
    password: string
    encrypt?: Encrypt
    warnAboutUnencrypted?: boolean
}): Promise<PhraseWallet | SeedWallet | PrivateKeyWallet> {
    const client = createClientAndMarkets(apiKey)
    try {
        const obj = JSON.parse(keystore)
        let decrypted

        if (LegacyKeystore.isKeystore(obj))
            decrypted = await new LegacyKeystore(obj).decrypt(password)
        else if (Web3Keystore.isKeystore(obj))
            decrypted = await new Web3Keystore(obj).decrypt(password)
        else throw new EncodingError('Invalid json')

        try {
            const phraseText = new TextDecoder().decode(decrypted)
            if (!Phrase.isValidPhrase(phraseText))
                return PrivateKeyWallet.new(
                    client.client,
                    client.markets,
                    decrypted,
                    warnAboutUnencrypted,
                    encrypt,
                )
            return PhraseWallet.new(
                client.client,
                client.markets,
                phraseText,
                warnAboutUnencrypted,
                encrypt,
            )
        } catch (_ex) {
            return PrivateKeyWallet.new(
                client.client,
                client.markets,
                decrypted,
                warnAboutUnencrypted,
                encrypt,
            )
        }
    } catch (ex) {
        if (ex instanceof IncorrectPassword) throw ex
        throw new EncodingError('Invalid json')
    }
}

export async function checkKeystore(keystore: string) {
    try {
        const keystoreObj = JSON.parse(keystore)
        return LegacyKeystore.isKeystore(keystoreObj) || Web3Keystore.isKeystore(keystoreObj)
    } catch (_ex) {
        return false
    }
}

export async function deserialize({
    apiKey = '',
    serialized,
    askForPassword,
}: {
    apiKey?: string
    serialized: string
    askForPassword: (attempts: number, reject: () => void) => Promise<string>
}) {
    const client = createClientAndMarkets(apiKey)
    try {
        const serializedParsed = JSON.parse(serialized)
        if (!Wallet.isSerializedWallet(serializedParsed))
            throw new EncodingError('Invalid serialized')

        const serializedWallet = serializedParsed as SerializedWallet

        switch (serializedWallet.walletType) {
            case 'privateKey':
                return await PrivateKeyWallet.import(
                    client.client,
                    client.markets,
                    serializedWallet as SerializedPrivateKeyWallet,
                    askForPassword,
                )
            case 'phrase':
                return await PhraseWallet.import(
                    client.client,
                    client.markets,
                    serializedWallet as SerializedSeedableWallet,
                    askForPassword,
                )
            case 'seed':
                return await SeedWallet.import(
                    client.client,
                    client.markets,
                    serializedWallet as SerializedSeedableWallet,
                    askForPassword,
                )
        }

        throw new EncodingError('Invalid serialized')
    } catch (ex) {
        throw new EncodingError('Invalid serialized')
    }
}

export async function checkSerialized(serialized: string) {
    try {
        await deserialize({
            serialized,
            askForPassword: async () => {
                return ''
            },
        })
        return true
    } catch (_ex) {
        return false
    }
}
