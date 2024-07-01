import Decimal from 'decimal.js'
import {Api} from 'chaingate-client'
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

export class CannotParseAmount extends Error {
    constructor(amountStr: string) {
        super(`Invalid amount: ${amountStr}`)
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

export class CurrencyAmount {
    readonly baseAmount: Decimal
    readonly baseSymbol: string

    readonly minimalUnitAmount: Decimal
    readonly minimalUnitSymbol: string

    constructor(currency: Currency, baseAmount: Decimal){
        this.baseAmount = baseAmount
        this.minimalUnitAmount = baseAmount.mul( (new Decimal(10)).pow(currency.currencyInfo.decimals))

        this.baseSymbol = currency.currencyInfo.symbol
        this.minimalUnitSymbol = currency.currencyInfo.minimalUnitSymbol
    }
}

export abstract class Fee {}
export abstract class FeeInitializer {}
export type PossibleFees<T> = {[key in FeeGrade]: T}

export type CurrencyInfo = {
    id: string
    name: string
    defaultDerivationPath: string
    svgLogoUrl: string,
    symbol: string,
    minimalUnitSymbol: string,
    decimals: number
}

export abstract class Currency{
    protected readonly api: Api
    public readonly currencyInfo: CurrencyInfo

    protected publicKey: PublicKey | null
    protected privateKeySource: PrivateKeySource

    protected constructor(currencyInfo: CurrencyInfo, api: Api, privateKeySource: PrivateKeySource) {
        this.currencyInfo = currencyInfo
        this.api = api
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

    amount(amountStr: string) : CurrencyAmount{
        const regex = /^(\d+(\.\d+)?) ?([A-Za-z]+)?$/
        const match = amountStr.match(regex)
        if (!match) throw new CannotParseAmount(amountStr)

        const amount = new Decimal(match[1])

        if (match[3]) {
            let currencySymbol = match[3].toLowerCase()
            if(currencySymbol.endsWith('s')) currencySymbol = currencySymbol.substring(currencySymbol.length - 1) //Remove plural -s

            if (currencySymbol === this.currencyInfo.symbol.toLowerCase() ||
                currencySymbol === this.currencyInfo.name.toLowerCase()) {
                return new CurrencyAmount(this, amount)
            } else if (currencySymbol === this.currencyInfo.minimalUnitSymbol.toLowerCase()) {
                return new CurrencyAmount(this, amount.mul((new Decimal(10)).pow(this.currencyInfo.decimals)))
            } else {
                throw new CannotParseAmount(amountStr)
            }
        }

        return new CurrencyAmount(this, amount)
    }


    abstract fee(fee: unknown): Fee

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
