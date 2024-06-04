import {Encryptable, Seed} from './index'
import {wordLists} from '../../Utils/PhraseGenerator'
import * as bip39 from '@scure/bip39'
import {HDKey} from '@scure/bip32'
import {mnemonicToSeed} from '@scure/bip39'

export class Phrase extends Encryptable{
    constructor(phrase: string | Uint8Array){
        if(phrase instanceof Uint8Array) super(phrase)
        else super(new TextEncoder().encode(phrase))
    }

    async derive(derivationPath: string){
        return (await this.getSeed()).derive(derivationPath)
    }

    async getSeed(){
        return new Seed(await mnemonicToSeed(this.phrase))
    }

    get phrase(){
        return new TextDecoder().decode(this.raw)
    }

    static isValidPhrase(phrase: string): boolean{
        for(const wordlist of Array.from(wordLists.values()))
            if(bip39.validateMnemonic(phrase, wordlist)) return true
        return false
    }
}
