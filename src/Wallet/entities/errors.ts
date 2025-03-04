export class EncryptionError extends Error {
    constructor(message: string) {
        super(message)
        if (Error.captureStackTrace) Error.captureStackTrace(this, EncryptionError)
        this.name = this.constructor.name
    }
}

