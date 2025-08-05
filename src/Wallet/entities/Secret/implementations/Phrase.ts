import * as bip39 from '@scure/bip39'
import { mnemonicToSeed } from '@scure/bip39'
import { WordsList } from '../../../implementations/PhraseWallet/WordsList'
import { Secret } from '../Secret'
import { Seed } from './Seed'
import { PhraseLanguage } from '../../../implementations/PhraseWallet/PhraseLanguage'
import { PhraseNumOfWords } from '../../../implementations/PhraseWallet/PhraseNumOfWords'
import { generateNewPhrase } from '../../../implementations/PhraseWallet/PhraseGenerator'

export class PhraseEncodingError extends Error {
    constructor(message: string) {
        super(message)
        if (Error.captureStackTrace) Error.captureStackTrace(this, PhraseEncodingError)
        this.name = this.constructor.name
    }
}

export class Phrase extends Secret {
    private readonly phrase: string

    constructor(phrase: string) {
        super()
        if (!Phrase.isValidPhrase(phrase)) throw new Error('Invalid phrase')
        this.phrase = phrase
    }

    async getSeed() {
        return new Seed(await mnemonicToSeed(await this.getPhrase()))
    }

    async getPhrase() {
        return new TextDecoder().decode(this.raw)
    }

    public static isValidPhrase(phrase: string): boolean {
        for (const language of Object.keys(WordsList) as PhraseLanguage[])
            if (bip39.validateMnemonic(phrase, WordsList[language])) return true
        return false
    }

    public static generateNewPhrase(
        language: PhraseLanguage = 'english',
        numberOfWords: PhraseNumOfWords = 12,
    ) {
        return generateNewPhrase(language, numberOfWords)
    }

    get raw(): Uint8Array {
        return new TextEncoder().encode(this.phrase)
    }

    static async new(source: string) {
        if (!Phrase.isValidPhrase(source)) throw new PhraseEncodingError('Invalid phrase')
        return new Phrase(source)
    }
}
