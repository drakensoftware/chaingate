import {Utils} from '../../Utils'
import {decryptAES, encryptAES, EncryptedData} from '../Crypto/AES'
import {AsyncMutex} from '@esfx/async-mutex'

class EncryptionError extends Error {
    constructor(message: string) {
        super(message)
        if (Error.captureStackTrace) Error.captureStackTrace(this, EncryptionError)
        this.name = this.constructor.name
    }
}

export class WalletIsEncrypted extends Error {
    constructor() {
        super('Wallet is currently encrypted. ' +
            'You should run functions that require the usage of private key with runUnencrypted(password, ...)')
        if (Error.captureStackTrace) Error.captureStackTrace(this, WalletIsEncrypted)
        this.name = this.constructor.name
    }
}

export abstract class Encryptable {
    private data: Uint8Array | EncryptedData
    private runDecryptedMuxed = new AsyncMutex()
    public enableRunningUnencryptedMessage = false

    get isEncrypted(): boolean {
        return this.data instanceof EncryptedData
    }

    get raw(): Uint8Array{
        if(this.data instanceof EncryptedData) throw new WalletIsEncrypted()
        if(this.enableRunningUnencryptedMessage && !this.runDecryptedMuxed.isLocked && !process.env.I_AM_SURE_I_AM_NOT_IN_PRODUCTION)
            console.warn('You are running with a wallet unencrypted. This should only be done for development purposes.\n' +
                'If you intend to use it in production, call encrypt(password) after it is created,\n' +
                'and run functions that require the usage of private key with runUnencrypted(password, ...)')
        return this.data
    }

    get hexa(){
        return Utils.bytesToHex(this.raw, false)
    }

    constructor(rawData: Uint8Array){
        this.data = rawData
    }

    async encrypt(password: string){
        if(this.data instanceof EncryptedData) throw new EncryptionError('Wallet is already encrypted')
        this.data = await encryptAES(this.data, password)
    }

    private async decrypt(password: string){
        if(!(this.data instanceof EncryptedData)) throw new EncryptionError('Wallet is not encrypted')
        this.data = await decryptAES(this.data, password)
    }

    async runUnencrypted<T>(password: string, fn: () => Promise<T>): Promise<T> {
        if(!this.isEncrypted) throw new Error('Wallet is not encrypted')
        try {
            await this.runDecryptedMuxed.lock()
            await this.decrypt(password)
            const result = await fn() // Capture the result of fn to return later
            await this.encrypt(password)
            return result // Return the result after locking
        } finally {
            this.runDecryptedMuxed.unlock() // Ensure mutex is always unlocked
        }
    }
}
