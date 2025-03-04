import {IncorrectPassword} from './errors'
import {blake2b} from '@noble/hashes/blake2b'
import {bytesToHex, hexToBytes} from '../../../../Utils/Utils'
import {Phrase} from '../../../entities/Secret/implementations/Phrase'
import {PrivateKey} from '../../../entities/Secret/implementations/PrivateKey'
import {Keystore} from './Keystore'


export interface LegacyKeystoreData {
    version: 1;
    crypto: {
        cipher: string;
        cipherparams: {
            iv: string;
        };
        ciphertext: string;
        kdf: 'pbkdf2';
        kdfparams: {
            c: number;
            prf: string;
            dklen: number;
            salt: string;
        };
        mac: string;
    };
}

type DerivedKey = {
    decryptKey: Uint8Array;
    passwordCheck: Uint8Array;
}

export class LegacyKeystore extends Keystore<Phrase | PrivateKey>{
    private readonly keystoreData
    private _derivedKey: DerivedKey


    constructor(keystoreData: LegacyKeystoreData) {
        super()
        this.keystoreData = keystoreData
    }

    async checkPassword(password: string): Promise<boolean> {
        const derivedKey = this._derivedKey ?? await this.deriveKey(password)

        const ciphertext = hexToBytes(this.keystoreData.crypto.ciphertext)
        const mac = blake256(Buffer.concat([derivedKey.passwordCheck, ciphertext]))

        if(mac === this.keystoreData.crypto.mac) this._derivedKey = derivedKey
        return mac === this.keystoreData.crypto.mac
    }

    private async deriveKey(password: string): Promise<DerivedKey> {
        const keyMaterial = await crypto.subtle.importKey(
            'raw',
            new TextEncoder().encode(password),
            { name: 'PBKDF2' },
            false,
            ['deriveBits', 'deriveKey']
        )

        const derivedBits = await crypto.subtle.deriveBits(
            {
                name: 'PBKDF2',
                salt: hexToBytes(this.keystoreData.crypto.kdfparams.salt),
                iterations: this.keystoreData.crypto.kdfparams.c,
                hash: { name: 'SHA-256' },
            },
            keyMaterial,
            this.keystoreData.crypto.kdfparams.dklen * 8 // length in bits
        )

        const derivedKeyRaw = new Uint8Array(derivedBits)

        return {
            decryptKey: derivedKeyRaw.slice(0, 16),
            passwordCheck: derivedKeyRaw.slice(16, 32),
        }
    }

    async decrypt(password: string): Promise<Phrase | PrivateKey> {
        const derivedKey = this._derivedKey ?? await this.deriveKey(password)
        if(!(await this.checkPassword(password))) throw new IncorrectPassword()

        const cipherParams = getCipherParams(this.keystoreData.crypto.cipher)

        const encryptKeyMaterial = await crypto.subtle.importKey(
            'raw',
            derivedKey.decryptKey,
            { name: cipherParams.name, length: cipherParams.length },
            false,
            ['encrypt', 'decrypt']
        )

        const decryptedCipertext = new Uint8Array(
            await crypto.subtle.decrypt(
                {
                    name: cipherParams.name,
                    length: cipherParams.length,
                    counter: hexToBytes(this.keystoreData.crypto.cipherparams.iv),
                },
                encryptKeyMaterial,
                hexToBytes(this.keystoreData.crypto.ciphertext)
            )
        )

        try{
            const phraseText = new TextDecoder().decode(decryptedCipertext)
            if(!Phrase.isValidPhrase(phraseText)) return new PrivateKey(decryptedCipertext)
            return new Phrase(phraseText)
        }catch (_ex){
            return new PrivateKey(decryptedCipertext)
        }
    }

    static isKeystore(obj: object): boolean {
        return 'version' in obj && obj.version == 1
    }
}

/**
 * Retrieves cipher parameters based on the cipher name.
 *
 * @param cipher - The cipher name from the keystore.
 * @returns An object containing the cipher name and key length.
 * @throws {Error} If the cipher is unsupported.
 */
function getCipherParams(cipher: string) {
    if (cipher.toLowerCase() === 'aes-128-ctr') {
        return { name: 'AES-CTR', length: 128 }
    } else {
        throw new Error(`Unsupported cipher: ${cipher}`)
    }
}

/**
 * Generates a Blake2b-256 hash of the provided data.
 *
 * @param data - The data to hash.
 * @returns The hexadecimal representation of the hash.
 */
function blake256(data: Buffer): string {
    const hash = blake2b(data, { dkLen: 32 })
    return bytesToHex(hash, false)
}
