import {bytesToHex} from '../../Utils/Utils'

export class PublicKey {
    readonly raw: Uint8Array
    //readonly uncompressed: Uint8Array

    public get hex(){
        return bytesToHex(this.raw, false)
    }

    constructor(compressed: Uint8Array){
        this.raw = compressed
        //this.uncompressed = uncompressed
    }

}
