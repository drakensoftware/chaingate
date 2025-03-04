import {HDKey} from '@scure/bip32'
import {Secret} from '../Secret'
import {hexToBytes, isHex} from '../../../../Utils/Utils'
import {ExtendedPublicKey} from '../ExtendedPublicKey'
import {ExtendedPrivateKey} from './ExtendedPrivateKey'

export class SeedEncodingError extends Error {
    constructor(message: string) {
        super(message)
        if (Error.captureStackTrace) Error.captureStackTrace(this, SeedEncodingError)
        this.name = this.constructor.name
    }
}

export class Seed extends Secret{
    private readonly seed: Uint8Array

    get raw(): Uint8Array {
        return this.seed
    }

    async getExtendedPublicKey(derivationPath: string){
        const publicKey =
            derivationPath ?
                HDKey.fromMasterSeed(this.raw).derive(derivationPath) :
                HDKey.fromMasterSeed(this.raw)

        return new ExtendedPublicKey(publicKey.publicKey, publicKey.publicExtendedKey)
    }

    async getExtendedPrivateKey(derivationPath: string){
        const privateKey =
            derivationPath ?
                HDKey.fromMasterSeed(this.raw).derive(derivationPath) :
                HDKey.fromMasterSeed(this.raw)

        return new ExtendedPrivateKey(privateKey.privateKey, privateKey.privateExtendedKey)
    }

    async getMasterPublicKey(){
        const publicKey = HDKey.fromMasterSeed(this.raw)
        return new ExtendedPublicKey(publicKey.publicKey, publicKey.publicExtendedKey)
    }

    async getMasterPrivateKey(){
        const privateKey = HDKey.fromMasterSeed(this.raw)
        return new ExtendedPrivateKey(HDKey.fromMasterSeed(this.raw).privateKey, privateKey.privateExtendedKey)
    }

    constructor(seed: Uint8Array) {
        super()
        this.seed = seed
    }

    static fromString(source: string): Seed {
        let bytes : Uint8Array

        if(isHex(source)) bytes = hexToBytes(source)
        else throw new SeedEncodingError('The string supplied is deemed to be invalid')

        return new Seed(bytes)
    }

    static fromBytes(source: Uint8Array): Seed {
        return new Seed(source)
    }
}
