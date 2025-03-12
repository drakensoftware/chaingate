import {AllCurrencies, Wallet} from '../../Wallet'
import {Phrase} from '../../entities/Secret/implementations/Phrase'
import {PrivateKey} from '../../entities/Secret/implementations/PrivateKey'
import {Seed} from '../../entities/Secret/implementations/Seed'
import {ChainGateClient} from 'chaingate-client'
import {ChainGateKeystore} from './Keystore/ChainGateKeystore'
import {CurrencyParams} from '../../entities/Currency/CurrencyParams'
import {IncorrectPassword} from './Keystore/errors'

export type Encrypt = {
    password: string,
    askForPassword: (attempts: number, reject: () => void) => Promise<string>
}

type SupportedSecrets = Phrase | Seed | PrivateKey

export class WalletIsNotEncrypted extends Error {
    constructor() {
        super(
            'Cannot export an unencrypted wallet. Initialize the wallet with encryption settings using ' +
            '`{ encrypt: { password: "yourPassword", askForPassword } }`, where:\n' +
            '- `password` is your encryption string\n' +
            '- `askForPassword` is the interactive password prompt function'
        )
        if (Error.captureStackTrace) Error.captureStackTrace(this, WalletIsNotEncrypted)
        this.name = this.constructor.name
    }
}

export class WalletIncorrectPassword extends Error {
    constructor() {
        super('Password for the wallet is incorrect')
        if (Error.captureStackTrace) Error.captureStackTrace(this, IncorrectPassword)
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

export abstract class LocalWallet<Secret extends SupportedSecrets, SupportedCurrencies extends AllCurrencies> extends Wallet<SupportedCurrencies> {
    private askForPassword: (attempts: number, reject: () => void) => Promise<string>
    private _secret: Secret | ChainGateKeystore
    private _uniqueId: string
    protected warnAboutUnencrypted = false

    protected constructor(apiClient: ChainGateClient, currencyParams: CurrencyParams, secret: Secret) {
        super(apiClient, currencyParams)
        this._secret = secret
    }

    protected async encrypt(password: string, askForPassword: (attempts: number, reject: () => void) => Promise<string>){
        if(this._secret instanceof ChainGateKeystore) throw new Error('Wallet is already encrypted')
        this._uniqueId = this._secret.uniqueId
        this._secret = await ChainGateKeystore.from(this._secret, password)
        this.askForPassword = askForPassword
    }

    protected async getSecret(): Promise<Secret> {
        if(this._secret instanceof ChainGateKeystore){
            let secret

            if(!this.askForPassword) throw new Error('Asking for password function not defined')
            else{
                let attempts = 0

                // eslint-disable-next-line no-constant-condition
                while(true) {
                    const password = await this.askForPassword(attempts, () => { throw new WalletIncorrectPassword() })
                    try {
                        secret = (await (this._secret as ChainGateKeystore).decrypt(password)) as Secret
                        break
                    }catch(e){
                        if (e instanceof IncorrectPassword) attempts++
                        else throw e
                    }
                }
            }

            return secret
        } else{
            if(this.warnAboutUnencrypted) {
                console.warn(
                    'WARNING: You are using an in-memory unencrypted wallet. ' +
                    'This may be acceptable in certain secure backend environments, ' +
                    'but can pose a security risk otherwise. ' +
                    'To disable this warning, set { warningAboutUnencrypted: false } during wallet creation.'
                )
                this.warnAboutUnencrypted = false
            }
            return this._secret
        }
    }

    /**
     * Retrieves the balances for all supported currencies.
     *
     * @returns A promise that resolves to an array of currency balances.
     */
    async getAllBalances(){
        return await Promise.all(
            this.allCurrencies.map(async (currency) => ({
                currency: currency.currencyInfo,
                balance: await currency.getBalance()
            }))
        )
    }

    async exportKeys(){
        if(!(this._secret instanceof ChainGateKeystore)) throw new WalletIsNotEncrypted()
        return this._secret.keystoreData
    }

    async getWalletUniqueId(): Promise<string> {
        const uniqueId = this._uniqueId ?? (await this.getSecret()).uniqueId
        return Promise.resolve(uniqueId)
    }

}
