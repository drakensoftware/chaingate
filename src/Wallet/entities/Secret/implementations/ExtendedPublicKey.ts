import {HDKey} from '@scure/bip32'

export class ExtendedPublicKey{
    get raw() {
        return HDKey.fromExtendedKey(this.xpub).publicKey
    }
    readonly xpub: string

    constructor(xpub: string) {
        this.xpub = xpub
    }
}
