export default class IncorrectPassword extends Error {
    constructor() {
        super('Password provided is not correct')
        if (Error.captureStackTrace) Error.captureStackTrace(this, IncorrectPassword)
        this.name = this.constructor.name
    }
}
