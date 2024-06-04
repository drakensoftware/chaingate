import {Utils} from '../../Utils'

export default class IncorrectPassword extends Error {
    constructor() {
        super('Password provided is not correct')
        if (Error.captureStackTrace) Error.captureStackTrace(this, IncorrectPassword)
        this.name = this.constructor.name
    }
}

export class EncryptedData {
    readonly salt: Uint8Array
    readonly iv: Uint8Array
    readonly encrypted: Uint8Array

    constructor(salt: Uint8Array, iv: Uint8Array, encrypted: Uint8Array) {
        this.salt = salt
        this.iv = iv
        this.encrypted = encrypted
    }
}

async function deriveKey(password: string, salt: Uint8Array){
    const keyMaterial = await crypto.subtle.importKey(
        'raw',
        (new TextEncoder()).encode(password),
        { name: 'PBKDF2' },
        false,
        ['deriveBits', 'deriveKey']
    )

    const derivedBits = await crypto.subtle.deriveBits(
        {
            name: 'PBKDF2',
            salt: salt,
            iterations: 600_000,
            hash: { name: 'SHA-256' }
        },
        keyMaterial,
        128
    )

    return new Uint8Array(derivedBits)
}

export async function encryptAES(data: Uint8Array, password: string): Promise<EncryptedData>{
    const salt = Utils.generateSecureRandomBytes(32)
    const iv = Utils.generateSecureRandomBytes(32)

    const derivedKey = await deriveKey(password, salt)


    const encryptKeyMaterial = await crypto.subtle.importKey(
        'raw',
        derivedKey,
        { name: 'AES-GCM', length: 256 },
        false,
        ['encrypt', 'decrypt']
    )

    const encrypted = new Uint8Array(await crypto.subtle.encrypt(
        {
            name: 'AES-GCM',
            length: 256,
            iv: iv
        },
        encryptKeyMaterial,
        data
    ))

    return new EncryptedData(salt, iv, encrypted)
}

export async function decryptAES(encryptedData: EncryptedData, password: string): Promise<Uint8Array>{
    const derivedKey = await deriveKey(password, encryptedData.salt)

    const encryptKeyMaterial = await crypto.subtle.importKey(
        'raw',
        derivedKey,
        { name: 'AES-GCM', length: 256 },
        false,
        ['encrypt', 'decrypt']
    )

    try{
        return new Uint8Array(await crypto.subtle.decrypt(
            {
                name: 'AES-GCM',
                length: 256,
                iv: encryptedData.iv
            },
            encryptKeyMaterial,
            encryptedData.encrypted
        ))
    }catch (ex){
        if(ex.code == 0 && ex.name == 'OperationError') throw new IncorrectPassword()
        throw ex
    }
}
