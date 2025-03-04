import {generateMnemonic} from '@scure/bip39'
import {
    WordsList
} from './WordsList'
import {PhraseLanguage} from './PhraseLanguage'
import {PhraseNumOfWords} from './PhraseNumOfWords'

export function generateNewPhrase(language: PhraseLanguage = 'english', numberOfWords: PhraseNumOfWords = 12) {
    let strength: number
    switch (numberOfWords) {
    case 12:
        strength = 128
        break
    case 15:
        strength = 160
        break
    case 18:
        strength = 192
        break
    case 21:
        strength = 224
        break
    case 24:
        strength = 256
        break
    }

    return generateMnemonic(WordsList[language], strength)
}
