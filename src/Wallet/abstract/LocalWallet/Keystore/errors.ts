export class IncorrectPassword extends Error {
    constructor() {
        super('Password provided is not correct')
        if (Error.captureStackTrace) Error.captureStackTrace(this, IncorrectPassword)
        this.name = this.constructor.name
    }
}

export class FormatError extends Error {
    constructor(message: string) {
        super(message)
        if (Error.captureStackTrace) Error.captureStackTrace(this, FormatError)
        this.name = this.constructor.name
    }
}
