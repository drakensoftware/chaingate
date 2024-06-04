import {wordlist as wl_czech} from '@scure/bip39/wordlists/czech'
import {wordlist as wl_english} from '@scure/bip39/wordlists/english'
import {wordlist as wl_french} from '@scure/bip39/wordlists/french'
import {wordlist as wl_italian} from '@scure/bip39/wordlists/italian'
import {wordlist as wl_japanese} from '@scure/bip39/wordlists/japanese'
import {wordlist as wl_korean} from '@scure/bip39/wordlists/korean'
import {wordlist as wl_portuguese} from '@scure/bip39/wordlists/portuguese'
import {wordlist as wl_simplifiedChinese} from '@scure/bip39/wordlists/simplified-chinese'
import {wordlist as wl_spanish} from '@scure/bip39/wordlists/spanish'
import {wordlist as wl_traditionalChinese} from '@scure/bip39/wordlists/traditional-chinese'
import {generateMnemonic} from '@scure/bip39'

export const wordLists = new Map([
    ['czech', wl_czech],
    ['english', wl_english],
    ['french', wl_french],
    ['italian', wl_italian],
    ['japanese', wl_japanese],
    ['korean', wl_korean],
    ['portuguese', wl_portuguese],
    ['simplifiedChinese', wl_simplifiedChinese],
    ['spanish', wl_spanish],
    ['traditionalChinese', wl_traditionalChinese]
])

export type PhraseLanguage =
    'czech'
    | 'english'
    | 'french'
    | 'italian'
    | 'japanese'
    | 'korean'
    | 'portuguese'
    | 'simplifiedChinese'
    | 'spanish'
    | 'traditionalChinese'

export type PhaseNumOfWords = 12 | 15 | 18 | 21 | 24

export abstract class PhraseGenerator{
    public static generateNewPhrase(language: PhraseLanguage = 'english', numberOfWords: PhaseNumOfWords = 12) {
        let wordList: string[]

        switch (language) {
        case 'czech':
            wordList = wl_czech
            break
        case 'english':
            wordList = wl_english
            break
        case 'french':
            wordList = wl_french
            break
        case 'italian':
            wordList = wl_italian
            break
        case 'japanese':
            wordList = wl_japanese
            break
        case 'korean':
            wordList = wl_korean
            break
        case 'portuguese':
            wordList = wl_portuguese
            break
        case 'simplifiedChinese':
            wordList = wl_simplifiedChinese
            break
        case 'spanish':
            wordList = wl_spanish
            break
        case 'traditionalChinese':
            wordList = wl_traditionalChinese
            break
        case null:
            wordList = wl_english
            break
        }

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

        return generateMnemonic(wordList, strength)
    }
}
