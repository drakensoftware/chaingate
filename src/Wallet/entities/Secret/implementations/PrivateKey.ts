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
        return wif.encodeRaw(128, Buffer.from(this.raw), true) //128 is bitcoin mainnet
    }

    get publicKey(): PublicKey{
        return new PublicKey(
            secp256k1.getPublicKey(this.raw, true)
        )
    }

    constructor(source: Uint8Array | string) {
        super()
        if(source instanceof Uint8Array) this.privateKey = source
        else{
            if(isHex(source)) {
                this.privateKey = hexToBytes(source)
            }
            else if(isBase58(source)){
                try{
                    this.privateKey = new Uint8Array(wif.decode(source).privateKey)
                }catch (_ex){
                    throw new PrivateKeyEncodingError('The string supplied in Wallet Import Format (WIF) is deemed to be invalid')
                }
            } else throw new PrivateKeyEncodingError('Invalid private key')
        }
    }

    get raw(): Uint8Array {
        return this.privateKey
    }
}
