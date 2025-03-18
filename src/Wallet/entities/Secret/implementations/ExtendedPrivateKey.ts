import {HDKey} from '@scure/bip32'

export class ExtendedPrivateKey{
    get raw() {
        return HDKey.fromExtendedKey(this.xpriv).privateKey
    }
    readonly xpriv: string

    constructor(xpriv: string) {
        this.xpriv = xpriv
    }
}

