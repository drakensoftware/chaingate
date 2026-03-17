import { generateMnemonic, mnemonicToSeedSync, validateMnemonic } from '@scure/bip39';
import { wordlist as czech } from '@scure/bip39/wordlists/czech.js';
import { wordlist as english } from '@scure/bip39/wordlists/english.js';
import { wordlist as french } from '@scure/bip39/wordlists/french.js';
import { wordlist as italian } from '@scure/bip39/wordlists/italian.js';
import { wordlist as japanese } from '@scure/bip39/wordlists/japanese.js';
import { wordlist as korean } from '@scure/bip39/wordlists/korean.js';
import { wordlist as portuguese } from '@scure/bip39/wordlists/portuguese.js';
import { wordlist as simplifiedChinese } from '@scure/bip39/wordlists/simplified-chinese.js';
import { wordlist as spanish } from '@scure/bip39/wordlists/spanish.js';
// Local copy — @scure/bip39@2.0.1 has a broken exports map for this wordlist
import { wordlist as traditionalChinese } from '../../../../wordlists/traditional-chinese';
import { Secret, EncryptedState } from '../../../Secret';
import { bytesToHex } from '../../../../utils';
import { Seed } from '../SeedWallet/Seed';
import { InvalidPhraseError } from '../../../errors';

/** Supported mnemonic languages. */
export type PhraseLanguage =
  | 'czech'
  | 'english'
  | 'french'
  | 'italian'
  | 'japanese'
  | 'korean'
  | 'portuguese'
  | 'simplifiedChinese'
  | 'spanish'
  | 'traditionalChinese';

/** Valid mnemonic word counts. More words = stronger security. */
export type PhraseNumOfWords = 12 | 15 | 18 | 21 | 24;

const wordlists: Record<PhraseLanguage, string[]> = {
  czech,
  english,
  french,
  italian,
  japanese,
  korean,
  portuguese,
  simplifiedChinese,
  spanish,
  traditionalChinese,
};

// Build a reverse lookup: word -> Set of language names
const wordToLanguages = new Map<string, Set<PhraseLanguage>>();
for (const [lang, wl] of Object.entries(wordlists) as [PhraseLanguage, string[]][]) {
  for (const word of wl) {
    let langs = wordToLanguages.get(word);
    if (!langs) {
      langs = new Set();
      wordToLanguages.set(word, langs);
    }
    langs.add(lang);
  }
}

const VALID_WORD_COUNTS = [12, 15, 18, 21, 24];

const WORDS_TO_STRENGTH: Record<number, number> = {
  12: 128,
  15: 160,
  18: 192,
  21: 224,
  24: 256,
};

/**
 * A mnemonic phrase (e.g. 12 or 24 words). Supports encryption and multi-language mnemonics.
 *
 * @example
 * ```ts
 * const phrase = Phrase.new('english', 12);
 * const phrase = new Phrase('abandon abandon ... about');
 * ```
 */
export class Phrase extends Secret {
  /**
   * @param phrase - A mnemonic string or {@link EncryptedState}.
   * @throws {@link InvalidPhraseError} if the mnemonic is invalid.
   */
  constructor(phrase: string | EncryptedState) {
    if (typeof phrase === 'object') {
      super(phrase);
    } else {
      Phrase.validate(phrase);
      super(new TextEncoder().encode(phrase.trim()));
    }
  }

  private get phrase(): string {
    return new TextDecoder().decode(this.data);
  }

  /** The mnemonic as raw bytes. */
  get raw(): Uint8Array {
    return this.data;
  }

  /** The mnemonic as hex. */
  get hex(): string {
    return bytesToHex(this.data);
  }

  /** The individual words of the mnemonic phrase. */
  get words(): string[] {
    return this.phrase.split(/\s+/);
  }

  /** Converts this mnemonic to a {@link Seed}. */
  getSeed(): Seed {
    return new Seed(mnemonicToSeedSync(this.phrase));
  }

  /**
   * Generates a new random mnemonic phrase.
   *
   * @param language - Wordlist language. Defaults to `'english'`.
   * @param numberOfWords - Number of words. Defaults to `12`.
   */
  static new(language: PhraseLanguage = 'english', numberOfWords: PhraseNumOfWords = 12): Phrase {
    const wordlist = wordlists[language];
    const strength = WORDS_TO_STRENGTH[numberOfWords];
    const mnemonic = generateMnemonic(wordlist, strength);
    return new Phrase(mnemonic);
  }

  /**
   * Checks whether a string is a valid mnemonic phrase (any supported language).
   *
   * @param phrase - The string to validate.
   */
  static isValid(phrase: string): boolean {
    try {
      Phrase.validate(phrase);
      return true;
    } catch {
      return false;
    }
  }

  private static validate(phrase: string): void {
    const trimmed = phrase.trim();
    if (!trimmed) throw new InvalidPhraseError('Mnemonic phrase is empty');

    const words = trimmed.split(/\s+/);
    if (!VALID_WORD_COUNTS.includes(words.length)) {
      throw new InvalidPhraseError(
        `Mnemonic must be ${VALID_WORD_COUNTS.join(', ')} words, got ${words.length}`,
      );
    }

    // Detect candidate languages from the first word to narrow the search
    const firstWord = words[0];
    const candidateLangs = wordToLanguages.get(firstWord);

    if (candidateLangs) {
      for (const lang of candidateLangs) {
        if (validateMnemonic(trimmed, wordlists[lang])) return;
      }
    }

    throw new InvalidPhraseError('Invalid mnemonic phrase');
  }
}
