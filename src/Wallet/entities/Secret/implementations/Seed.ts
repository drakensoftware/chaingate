import {HDKey} from '@scure/bip32'
import {Secret} from '../Secret'
import {hexToBytes, isHex} from '../../../../Utils/Utils'
import {ExtendedPublicKey} from './ExtendedPublicKey'
import {ExtendedPrivateKey} from './ExtendedPrivateKey'
import {PublicKey} from '../../PublicKey'
import {PrivateKey} from './PrivateKey'

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

        return new ExtendedPublicKey(publicKey.publicExtendedKey)
    }

    async getExtendedPrivateKey(derivationPath: string){
        const privateKey =
            derivationPath ?
                HDKey.fromMasterSeed(this.raw).derive(derivationPath) :
                HDKey.fromMasterSeed(this.raw)

        return new ExtendedPrivateKey(privateKey.privateExtendedKey)
    }

    async getPublicKey(derivationPath: string){
        const publicKey =
            derivationPath ?
                HDKey.fromMasterSeed(this.raw).derive(derivationPath) :
                HDKey.fromMasterSeed(this.raw)

        return new PublicKey(publicKey.publicKey)
    }

    async getPrivateKey(derivationPath: string){
        const privateKey =
            derivationPath ?
                HDKey.fromMasterSeed(this.raw).derive(derivationPath) :
                HDKey.fromMasterSeed(this.raw)

        return new PrivateKey(privateKey.privateKey)
    }

    async getMasterPublicKey(){
        const publicKey = HDKey.fromMasterSeed(this.raw)
        return new ExtendedPublicKey(publicKey.publicExtendedKey)
    }

    async getMasterPrivateKey(){
        const privateKey = HDKey.fromMasterSeed(this.raw)
        return new ExtendedPrivateKey(privateKey.privateExtendedKey)
    }

    constructor(source: Uint8Array | string) {
        super()

        if(source instanceof Uint8Array) this.seed = source
        else{
            if(isHex(source)) this.seed = hexToBytes(source)
            else throw new SeedEncodingError('The string supplied is deemed to be invalid')
        }
    }
}
