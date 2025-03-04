import {secp256k1} from '@noble/curves/secp256k1'
import * as wif from 'wif'
import {Secret} from '../Secret'
import {PublicKey} from '../../PublicKey'
import {hexToBytes, isBase58, isHex} from '../../../../Utils/Utils'

export class PrivateKeyEncodingError extends Error {
    constructor(message: string) {
        super(message)
        if (Error.captureStackTrace) Error.captureStackTrace(this, PrivateKeyEncodingError)
        this.name = this.constructor.name
    }
}


export class PrivateKey extends Secret {
    private readonly privateKey: Uint8Array

    get wif(){
        return wif.encode(128, Buffer.from(this.raw), true) //128 is bitcoin mainnet
    }

    get publicKey(): PublicKey{
        return new PublicKey(
            secp256k1.getPublicKey(this.raw, true)
        )
    }

    constructor(privateKey: Uint8Array) {
        super()
        this.privateKey = privateKey
    }

    get raw(): Uint8Array {
        return this.privateKey
    }

    static fromString(source: string): PrivateKey {
        let bytes : Uint8Array

        if(isHex(source)) {
            bytes = hexToBytes(source)
        }
        else if(isBase58(source)){
            try{
                bytes = new Uint8Array(wif.decode(source).privateKey)
            }catch (_ex){
                throw new PrivateKeyEncodingError('The string supplied in Wallet Import Format (WIF) is deemed to be invalid')
            }
        } else throw new PrivateKeyEncodingError('Invalid private key')

        return new PrivateKey(bytes)
    }

    static fromBytes(source: Uint8Array): PrivateKey {
        return new PrivateKey(source)
    }
}
