import {randomBytes} from '@noble/hashes/utils'
import {gcm} from '@noble/ciphers/aes'
import {pbkdf2} from '../../../Utils/Crypto'

const iterations = 600_000
const dkLen = 32

export class IncorrectPassword extends Error {
    constructor() {
        super(
            'Password is incorrect'
        )
        if (Error.captureStackTrace) Error.captureStackTrace(this, IncorrectPassword)
        this.name = this.constructor.name
    }
}

export class Encrypted {
    public readonly iterations: number
    public readonly dkLen: number
    public readonly nonce: Uint8Array
    public readonly salt: Uint8Array
    public readonly data: Uint8Array
    public readonly cipher: string

    constructor(params: {
        iterations: number;
        dkLen: number;
        nonce: Uint8Array;
        salt: Uint8Array;
        data: Uint8Array;
        cipher: string;
    }) {
        this.iterations = params.iterations
        this.dkLen = params.dkLen
        this.nonce = params.nonce
        this.salt = params.salt
        this.data = params.data
        this.cipher = params.cipher
    }

    public static async encrypt(dataToEncrypt: Uint8Array, password: string){
        const cipher = 'aes-gcm'

        const salt = randomBytes(32)
        const nonce = randomBytes(12)
        const derivedKey = await pbkdf2({iterations, dkLen, salt, password})
        const data = gcm(derivedKey, nonce).encrypt(dataToEncrypt)

        return new Encrypted({
            iterations, dkLen, nonce, salt, data, cipher
        })
    }

    public static async decrypt(encrypted: Encrypted, password: string){
        const iterations = encrypted.iterations
        const dkLen = encrypted.dkLen
        const salt = encrypted.salt
        const nonce = encrypted.nonce

        const derivedKey = await pbkdf2({iterations, dkLen, salt, password})
        try{
            return gcm(derivedKey, nonce).decrypt(encrypted.data)
        }catch (ex){
            if('message' in ex && ex.message == 'aes/gcm: invalid ghash tag') throw new IncorrectPassword()
            else throw ex
        }
    }

}