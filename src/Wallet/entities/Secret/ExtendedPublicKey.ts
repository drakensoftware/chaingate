import {HDKey} from '@scure/bip32'

export class ExtendedPublicKey{
    readonly raw: Uint8Array
    readonly xpub: string

    constructor(publicKey: Uint8Array, xpub: string) {
        this.raw = publicKey
        this.xpub = xpub
    }

    static fromXPub(xpub: string): ExtendedPublicKey {
        return new ExtendedPublicKey(HDKey.fromExtendedKey(xpub).publicKey, xpub)
    }
}
