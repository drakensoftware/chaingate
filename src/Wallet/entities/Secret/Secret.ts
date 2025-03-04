import {bytesToHex} from '../../../Utils/Utils'
import {hmac} from '@noble/hashes/hmac'
import {sha256} from '@noble/hashes/sha256'

export abstract class Secret {
    abstract get raw(): Uint8Array

    get hexa(){
        return bytesToHex(this.raw, false)
    }

    get uniqueId(): string{
        const uniqueIdRaw = hmac(sha256, 'ChainGate Secret Unique Id', this.raw)
        return bytesToHex(uniqueIdRaw, false)
    }
}
