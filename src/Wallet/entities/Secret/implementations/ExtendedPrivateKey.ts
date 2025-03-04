import {PrivateKey} from './PrivateKey'

export class ExtendedPrivateKey extends PrivateKey{
    readonly xpriv: string

    constructor(privateKeyRaw: Uint8Array, xpriv: string) {
        super(privateKeyRaw)
        this.xpriv = xpriv
    }
}
