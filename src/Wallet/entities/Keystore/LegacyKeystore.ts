import { IncorrectPassword } from './errors'
import { blake2b } from '@noble/hashes/blake2b'
import { bytesToHex, hexToBytes } from '../../../InternalUtils/Utils'
import { ctr } from '@noble/ciphers/aes'
import { pbkdf2 } from '../../../InternalUtils/Crypto'

export interface LegacyKeystoreData {
    version: 1
    crypto: {
        cipher: string
        cipherparams: {
            iv: string
        }
        ciphertext: string
        kdf: 'pbkdf2'
        kdfparams: {
            c: number
            prf: string
            dklen: number
            salt: string
        }
        mac: string
    }
}

type DerivedKey = {
    decryptKey: Uint8Array
    passwordCheck: Uint8Array
}

export class LegacyKeystore {
    private readonly keystoreData
    private _derivedKey: DerivedKey

    constructor(keystoreData: LegacyKeystoreData) {
        this.keystoreData = keystoreData
    }

    async checkPassword(password: string): Promise<boolean> {
        const derivedKey = this._derivedKey ?? (await this.deriveKey(password))

        const ciphertext = hexToBytes(this.keystoreData.crypto.ciphertext)
        const mac = bytesToHex(
            blake2b(Buffer.concat([derivedKey.passwordCheck, ciphertext]), { dkLen: 32 }),
            false,
        )

        if (mac === this.keystoreData.crypto.mac) this._derivedKey = derivedKey
        return mac === this.keystoreData.crypto.mac
    }

    private async deriveKey(password: string): Promise<DerivedKey> {
        const salt = hexToBytes(this.keystoreData.crypto.kdfparams.salt)
        const iterations = this.keystoreData.crypto.kdfparams.c
        const dkLen = this.keystoreData.crypto.kdfparams.dklen
        const derivedKeyRaw = await pbkdf2({ password, salt, dkLen, iterations })

        return {
            decryptKey: derivedKeyRaw.slice(0, 16),
            passwordCheck: derivedKeyRaw.slice(16, 32),
        }
    }

    async decrypt(password: string): Promise<Uint8Array> {
        const derivedKey = this._derivedKey ?? (await this.deriveKey(password))
        if (!(await this.checkPassword(password))) throw new IncorrectPassword()

        const nonce = hexToBytes(this.keystoreData.crypto.cipherparams.iv)
        const encryptedData = hexToBytes(this.keystoreData.crypto.ciphertext)
        return ctr(derivedKey.decryptKey, nonce).decrypt(encryptedData)
    }

    static isKeystore(obj: object): boolean {
        return 'version' in obj && obj.version == 1
    }
}
