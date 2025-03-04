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
import {PhraseLanguage} from './PhraseLanguage'


export const WordsList: { [key in PhraseLanguage]: string[] } = {
    'czech': wl_czech,
    'english': wl_english,
    'french': wl_french,
    'italian': wl_italian,
    'japanese': wl_japanese,
    'korean': wl_korean,
    'portuguese': wl_portuguese,
    'simplifiedChinese': wl_simplifiedChinese,
    'spanish': wl_spanish,
    'traditionalChinese': wl_traditionalChinese
}
