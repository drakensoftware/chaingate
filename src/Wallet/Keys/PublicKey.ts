export class PublicKey {
    readonly compressed: Uint8Array
    readonly uncompressed: Uint8Array


    constructor(compressed: Uint8Array, uncompressed: Uint8Array){
        this.compressed = compressed
        this.uncompressed = uncompressed
    }

}
