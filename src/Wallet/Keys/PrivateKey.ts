import wif from 'wif'
import {secp256k1} from '@noble/curves/secp256k1'
import {PublicKey} from './PublicKey'
import {Encryptable} from './Ecryptable'

export class PrivateKey extends Encryptable {
    get wif(){
        return wif.encode(128, Buffer.from(this.raw), true) //128 is bitcoin mainnet
    }

    async getPublicKey(): Promise<PublicKey>{
        return new PublicKey(
            secp256k1.getPublicKey(this.raw, true),
            secp256k1.getPublicKey(this.raw, false)
        )
    }
}
