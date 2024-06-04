import {Utils} from '../../../Utils'
import IncorrectPassword from './IncorrectPassword'
import {blake2b} from '@noble/hashes/blake2b'
export type KeystoreV1 = {
    crypto: {
        cipher: string
        ciphertext: string
        cipherparams: {
            iv: string
        }
        kdf: string
        kdfparams: {
            prf: string
            dklen: number
            salt: string
            c: number
        }
        mac: string
    }
    id: string
    version: number
    meta: string
}

type DerivedKey = {
    decryptKey: Uint8Array
    passwordCheck: Uint8Array
}

export async function decryptKeystoreV1(keystoreStr: string, password: string) {
    const keystore = JSON.parse(keystoreStr) as KeystoreV1

    const derivedKeys = await deriveKeys(keystore, password)
    if(!checkPassword(keystore, derivedKeys)) throw new IncorrectPassword()
    return await decrypt(keystore, derivedKeys)
}

export function isKeystoreV1(keystoreStr: string){
    try{
        const parsed = JSON.parse(keystoreStr)
        return 'version' in parsed && parsed.version == 1
    }catch (_ex){
        return false
    }
}

async function deriveKeys(keystore: KeystoreV1, password: string): Promise<DerivedKey>{

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
            salt: Utils.hexToBytes(keystore.crypto.kdfparams.salt),
            iterations: keystore.crypto.kdfparams.c,
            hash: { name: 'SHA-256' }
        },
        keyMaterial,
        keystore.crypto.kdfparams.dklen * 8 // length in bits
    )

    const derivedKeyRaw = new Uint8Array(derivedBits)


    return {
        decryptKey: derivedKeyRaw.slice(0, 16),
        passwordCheck: derivedKeyRaw.slice(16, 32)
    }
}

function checkPassword(keystore: KeystoreV1, derivedKey: DerivedKey){
    const ciphertext = Utils.hexToBytes(keystore.crypto.ciphertext)
    const mac = blake256(Buffer.concat([derivedKey.passwordCheck, ciphertext]))
    return mac === keystore.crypto.mac
}

async function decrypt(keystore: KeystoreV1, derivedKey: DerivedKey){
    const encryptKeyMaterial = await crypto.subtle.importKey(
        'raw',
        derivedKey.decryptKey,
        { name: getCypher(keystore.crypto.cipher).name, length: getCypher(keystore.crypto.cipher).length },
        false,
        ['encrypt', 'decrypt']
    )

    return new Uint8Array(await crypto.subtle.decrypt(
        {
            name: getCypher(keystore.crypto.cipher).name,
            length: getCypher(keystore.crypto.cipher).length,
            counter: Utils.hexToBytes(keystore.crypto.cipherparams.iv)
        },
        encryptKeyMaterial,
        Utils.hexToBytes(keystore.crypto.ciphertext)
    ))
}

function getCypher(keystoreCypher: string){
    switch (keystoreCypher.toLowerCase()){
    case 'aes-128-ctr':
        return {name: 'AES-CTR', length: 128}
    default:
        return null
    }
}

function blake256(data: Buffer): string {
    const hash = blake2b(data, { dkLen: 32 })
    return Utils.bytesToHex(hash, false)
}
