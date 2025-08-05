import { Encrypted, IncorrectPassword } from './Encrypted'

export type Encrypt = {
    password: string
    askForPassword: (attempts: number, reject: () => void) => Promise<string>
}

export class WalletIsNotEncrypted extends Error {
    constructor() {
        super(
            'Cannot serialize an unencrypted wallet. Initialize the wallet with encryption settings using ' +
                '`{ encrypt: { password: "yourPassword", askForPassword } }`, where:\n' +
                '- `password` is your encryption string\n' +
                '- `askForPassword` is the interactive password prompt function',
        )
        if (Error.captureStackTrace) Error.captureStackTrace(this, WalletIsNotEncrypted)
        this.name = this.constructor.name
    }
}

export class WalletIncorrectPassword extends Error {
    constructor() {
        super('Password for the wallet is incorrect')
        if (Error.captureStackTrace) Error.captureStackTrace(this, WalletIncorrectPassword)
        this.name = this.constructor.name
    }
}

export class EncodingError extends Error {
    constructor(message: string) {
        super(message)
        if (Error.captureStackTrace) Error.captureStackTrace(this, EncodingError)
        this.name = this.constructor.name
    }
}

export class WalletEncryption {
    private askForPassword: (attempts: number, reject: () => void) => Promise<string>
    private _secret: Uint8Array | Encrypted
    public warnAboutUnencrypted = false

    get isEncrypted() {
        return this._secret instanceof Encrypted
    }

    constructor(
        secret: Uint8Array | Encrypted,
        askForPassword?: (attempts: number, reject: () => void) => Promise<string>,
    ) {
        this._secret = secret
        this.askForPassword = askForPassword
    }

    async encrypt(password: string) {
        if (this._secret instanceof Encrypted) throw new Error('Wallet is already encrypted')
        this._secret = await Encrypted.encrypt(this._secret, password)
    }

    getSecret() {
        return this._secret
    }

    async getSecretDecrypted(): Promise<Uint8Array> {
        if (this._secret instanceof Encrypted) {
            if (!this.askForPassword) throw new Error('Asking for password function not defined')
            else {
                let attempts = 0

                // eslint-disable-next-line no-constant-condition
                let encrypted
                while (!encrypted) {
                    const password = await this.askForPassword(attempts, () => {
                        throw new WalletIncorrectPassword()
                    })
                    try {
                        encrypted = await Encrypted.decrypt(this._secret, password)
                    } catch (e) {
                        if (e instanceof IncorrectPassword) attempts++
                        else throw e
                    }
                }
                return encrypted
            }
        } else {
            if (this.warnAboutUnencrypted) {
                console.warn(
                    'WARNING: You are using an in-memory unencrypted wallet. ' +
                        'This may be acceptable in certain secure backend environments, ' +
                        'but can pose a security risk otherwise. ' +
                        'To disable this warning, set { warningAboutUnencrypted: false } during wallet creation.',
                )
                this.warnAboutUnencrypted = false
            }
            return this._secret
        }
    }
}
