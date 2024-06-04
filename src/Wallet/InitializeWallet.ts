import {PhaseNumOfWords, PhraseGenerator, PhraseLanguage} from '../Utils/PhraseGenerator'
import {PhraseWallet} from './PhraseWallet'
import {ChainGateClient} from 'chaingate-client'
import {Phrase} from './Keys'
import {decryptKeystoreV1, isKeystoreV1} from './Crypto/KeystoreDecoder/KeystoreV1'
import {decryptKeystore} from './Crypto/KeystoreDecoder/OtherKeystores'
import {ImportedPrivateKey} from './ImportedPrivateKey'
import {PrivateKey} from './Keys'
import IncorrectPassword from './Crypto/KeystoreDecoder/IncorrectPassword'
import {Utils} from '../Utils'
import {HDWallet} from './HDWallet'
import {Seed} from './Keys'
import wif from 'wif'

export class EncodingError extends Error {
    constructor(message: string) {
        super(message)
        if (Error.captureStackTrace) Error.captureStackTrace(this, EncodingError)
        this.name = this.constructor.name
    }
}

export async function create(apiKey: string,
    phraseLanguage: PhraseLanguage = 'english', phraseNumOfWords: PhaseNumOfWords = 12) {
    const phrase = PhraseGenerator.generateNewPhrase(phraseLanguage, phraseNumOfWords)
    return await PhraseWallet.new(new ChainGateClient(apiKey), new Phrase(phrase))
}

export async function fromKeystore(apiKey: string, keystore: string, password: string) {
    //Some keystores store the phrase and others the private key
    try {
        const decodedKeystore = isKeystoreV1(keystore)
            ? await decryptKeystoreV1(keystore, password)
            : await decryptKeystore(keystore, password)

        let phrase
        try {
            phrase = new TextDecoder().decode(decodedKeystore)
        } catch { /* empty */ }

        if (phrase && Phrase.isValidPhrase(phrase)) {
            return PhraseWallet.new(new ChainGateClient(apiKey), new Phrase(phrase))
        } else {
            return ImportedPrivateKey.new(new ChainGateClient(apiKey), new PrivateKey(decodedKeystore))
        }
    } catch (ex) {
        if (ex instanceof IncorrectPassword) throw ex
        throw new EncodingError('Invalid keystore')
    }
}

export async function fromPhrase(apiKey: string, phrase: string) {
    if(!Phrase.isValidPhrase(phrase)) throw new EncodingError('Invalid phrase')
    return PhraseWallet.new(new ChainGateClient(apiKey), new Phrase(phrase))
}

export async function fromSeed(apiKey: string, seed: string | Uint8Array, ){
    if(typeof seed === 'string' && Utils.isHex(seed)) seed = Utils.hexToBytes(seed)
    else if(typeof seed === 'string') throw new EncodingError('Invalid seed')

    return HDWallet.new(new ChainGateClient(apiKey), new Seed(seed))
}

export async function  fromPrivateKey(apiKey: string, privateKey: string | Uint8Array){
    if(typeof privateKey === 'string' && Utils.isHex(privateKey)) privateKey = Utils.hexToBytes(privateKey)
    else if(typeof privateKey === 'string' && Utils.isBase58(privateKey)){
        try{
            privateKey = new Uint8Array(wif.decode(privateKey).privateKey)
        }catch (_ex){
            throw new EncodingError('The string supplied in Wallet Import Format (WIF) is deemed to be invalid')
        }
    }else if(typeof privateKey === 'string') throw new EncodingError('Private key is invalid or the format is unrecognized')

    return ImportedPrivateKey.new(new ChainGateClient(apiKey), new PrivateKey(privateKey))
}
