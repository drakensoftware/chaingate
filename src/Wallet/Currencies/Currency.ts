import Decimal from 'decimal.js'
import {ChainGateClient} from 'chaingate-client'
import {Phrase, PrivateKey, PrivateKeySource, PublicKey, Seed} from '../Keys'

export class NotEnoughFundsError extends Error {
    constructor(currency: Currency, missingFunds: CurrencyAmount) {
        super(`Wallet does not have enough funds. ${missingFunds.baseAmount} ${missingFunds.baseSymbol} needed.`)
        if (Error.captureStackTrace) Error.captureStackTrace(this, NotEnoughFundsError)
        this.name = this.constructor.name
    }
}

export class CannotDerive extends Error {
    constructor() {
        super('Derivation path are not supported (Are you using an imported private key?)')
        if (Error.captureStackTrace) Error.captureStackTrace(this, CannotDerive)
        this.name = this.constructor.name
    }
}

export type FeeGrade = 'low' | 'normal' | 'high' | 'maximum'

export abstract class ConfirmedTransaction {
    abstract readonly txId: string

    abstract isConfirmed(): Promise<boolean>
    waitToBeConfirmed(): Promise<void> {
        // eslint-disable-next-line no-async-promise-executor
        return new Promise(async (resolve) => {
            // First check before starting the interval
            if (await this.isConfirmed()) {
                resolve()
            } else {
                const intervalId = setInterval(async () => {
                    if (await this.isConfirmed()) {
                        clearInterval(intervalId)
                        resolve()
                    }
                }, 10000)
            }
        })
    }
}

export abstract class PreparedTransaction {
    abstract readonly possibleFees: { [key in FeeGrade]: Fee }
    abstract confirm(fee: string | Fee): Promise<ConfirmedTransaction>
}

export abstract class CurrencyAmount {
    abstract get baseAmount(): Decimal
    abstract get baseSymbol(): string

    abstract get minimalAmount(): Decimal
    abstract get minimalSymbol(): string
}

export abstract class Fee {}
export type PossibleFees<T> = {[key in FeeGrade]: T}

export type CurrencyInfo = {
    id: string
    name: string
    defaultDerivationPath: string
    svgLogoUrl: string,
    symbol: string
}



export abstract class Currency{

    protected readonly chaingateClient: ChainGateClient
    public readonly currencyInfo: CurrencyInfo

    protected publicKey: PublicKey | null
    protected privateKeySource: PrivateKeySource

    protected constructor(currencyInfo: CurrencyInfo, chaingateClient: ChainGateClient, privateKeySource: PrivateKeySource) {
        this.currencyInfo = currencyInfo
        this.chaingateClient = chaingateClient
        this.privateKeySource = privateKeySource
        this._derivationPath = currencyInfo.defaultDerivationPath
    }

    async getPrivateKey() {
        if (this.privateKeySource instanceof PrivateKey) return this.privateKeySource
        else if (this.privateKeySource instanceof Seed || this.privateKeySource instanceof Phrase) {
            return this.privateKeySource.derive(this.getDerivationPath())
        }
    }

    async initializePublicKey(){
        this.publicKey = await (await this.getPrivateKey()).getPublicKey()
    }

    abstract getAddress(): Promise<string>
    abstract getBalance(address?: string): Promise<{confirmed: CurrencyAmount, unconfirmed: CurrencyAmount}>

    abstract prepareTransfer(toAddress: string, amount: CurrencyAmount): Promise<PreparedTransaction>

    // #region Derivation Paths
    private _derivationPath: string | null

    getDerivationPath(){
        return this._derivationPath
    }

    async setDerivationPath(newDerivationPath: string){
        this._derivationPath = newDerivationPath
        await this.initializePublicKey()
    }
    // #endregion
}
