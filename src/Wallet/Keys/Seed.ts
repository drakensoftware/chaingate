import {HDKey} from '@scure/bip32'
import {Encryptable, PrivateKey} from './index'

export class Seed extends Encryptable{

    async derive(derivationPath: string){
        return new PrivateKey(HDKey.fromMasterSeed(this.raw).derive(derivationPath).privateKey)
    }

    get xpriv(){
        return HDKey.fromMasterSeed(this.raw).privateExtendedKey
    }

    constructor(seed: Uint8Array) {
        super(seed)
    }

}
