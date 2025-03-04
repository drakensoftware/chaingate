import {bytesToHex, hexToBytes} from '../../../../Utils/Utils'
import {Phrase} from '../../../entities/Secret/implementations/Phrase'
import {Seed} from '../../../entities/Secret/implementations/Seed'
import {PrivateKey} from '../../../entities/Secret/implementations/PrivateKey'
import {Keystore} from './Keystore'
import {FormatError, IncorrectPassword} from './errors'

export type ChainGateKeystoreData = {
    walletUniqueId: string
    format: 'ChainGate Keystore Version 1'
    version: 1
    type: 'seed' | 'phrase' | 'privateKey'
    crypto: {
        iv: string
        kdfsalt: string
        ciphertext: string
    }
}


export class ChainGateKeystore extends Keystore<Phrase | Seed | PrivateKey>{
    readonly keystoreData
    private _derivedKey: Uint8Array

    constructor(keystoreData: ChainGateKeystoreData) {
        super()
        this.keystoreData = keystoreData
    }

    async checkPassword(password: string): Promise<boolean> {
        try{
            await this.decrypt(password)
            return true
        }catch(ex){
            if(ex instanceof IncorrectPassword) return false
            throw ex
        }
    }

    async decrypt(password: string): Promise<PrivateKey | Seed | Phrase> {
        const derivedKey = this._derivedKey ?? await this.deriveKey(password)

        // Import the derived key for decryption
        const decryptKey = await crypto.subtle.importKey(
            'raw',
            derivedKey,
            { name: 'AES-GCM' },
            false,
            ['decrypt']
        )

        // Decrypt the ciphertext
        let decrypted: Uint8Array
        try {
            decrypted = new Uint8Array(
                await crypto.subtle.decrypt(
                    {
                        name: 'AES-GCM',
                        iv: hexToBytes(this.keystoreData.crypto.iv),
                    },
                    decryptKey,
                    hexToBytes(this.keystoreData.crypto.ciphertext)
                )
            )
        } catch (ex) {
            if ('name' in ex && ex.name === 'OperationError') {
                throw new IncorrectPassword()
            } else {
                throw new Error('Failed to decrypt')
            }
        }

        let secret: Phrase | Seed | PrivateKey
        switch (this.keystoreData.type) {
        case 'phrase':
            secret = new Phrase(new TextDecoder().decode(decrypted))
            break
        case 'seed':
            secret = new Seed(decrypted)
            break
        case 'privateKey':
            secret = new PrivateKey(decrypted)
            break
        default:
            throw new FormatError('Unsupported crypto type in keystore')
        }

        return secret
    }

    static isKeystore(obj: object): boolean {
        try {
            return (
                'version' in obj &&
                'format' in obj &&
                obj.version === 1 &&
                obj.format === 'ChainGate Keystore Version 1'
            )
        } catch {
            return false
        }
    }

    static async from(data: Phrase | Seed | PrivateKey, password: string): Promise<ChainGateKeystore> {
        const PBKDF2_ITERATIONS = 1_500_000

        // Prepare the data to be encrypted
        let dataBytes: Uint8Array
        let type: 'phrase' | 'seed' | 'privateKey'

        if (data instanceof Phrase) {
            dataBytes = new TextEncoder().encode(await data.getPhrase())
            type = 'phrase'
        } else if (data instanceof Seed) {
            dataBytes = data.raw
            type = 'seed'
        } else if (data instanceof PrivateKey) {
            dataBytes = data.raw
            type = 'privateKey'
        } else {
            throw new Error('Invalid data type')
        }

        // Generate a random salt for key derivation
        const kdfSalt = crypto.getRandomValues(new Uint8Array(32)) // 256-bit salt

        // Setup key material for key derivation
        const keyMaterial = await crypto.subtle.importKey(
            'raw',
            new TextEncoder().encode(password),
            { name: 'PBKDF2' },
            false,
            ['deriveBits', 'deriveKey']
        )

        // Derive the key
        const derivedKeyBits = await crypto.subtle.deriveBits(
            {
                name: 'PBKDF2',
                salt: kdfSalt,
                iterations: PBKDF2_ITERATIONS,
                hash: 'SHA-256',
            },
            keyMaterial,
            256
        )

        const derivedKey = new Uint8Array(derivedKeyBits)

        // Import the derived key for encryption
        const encryptKey = await crypto.subtle.importKey(
            'raw',
            derivedKey,
            { name: 'AES-GCM' },
            false,
            ['encrypt']
        )

        // Generate a random initialization vector (IV)
        const iv = crypto.getRandomValues(new Uint8Array(12)) // 96-bit IV

        // Encrypt the data
        const encryptedData = await crypto.subtle.encrypt(
            {
                name: 'AES-GCM',
                iv: iv,
            },
            encryptKey,
            dataBytes
        )

        // Build the keystore object
        return new ChainGateKeystore({
            walletUniqueId: data.uniqueId,
            format: 'ChainGate Keystore Version 1',
            version: 1,
            type,
            crypto: {
                iv: bytesToHex(iv, false),
                kdfsalt: bytesToHex(kdfSalt, false),
                ciphertext: bytesToHex(new Uint8Array(encryptedData), false),
            }
        })
    }

    private async deriveKey(password: string): Promise<Uint8Array> {
        const PBKDF2_ITERATIONS = 1_500_000

        // Setup key material for key derivation
        const deriveKeyMaterial = await crypto.subtle.importKey(
            'raw',
            new TextEncoder().encode(password),
            { name: 'PBKDF2' },
            false,
            ['deriveBits', 'deriveKey']
        )

        // Derive the key
        const derivedKeyBits = await crypto.subtle.deriveBits(
            {
                name: 'PBKDF2',
                salt: hexToBytes(this.keystoreData.crypto.kdfsalt),
                iterations: PBKDF2_ITERATIONS,
                hash: 'SHA-256',
            },
            deriveKeyMaterial,
            256
        )

        return new Uint8Array(derivedKeyBits)
    }
}
