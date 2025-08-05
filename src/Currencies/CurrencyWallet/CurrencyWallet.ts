import { Address } from '../../Wallet/entities/Address'
import { Transports } from './Transports'
import { Transaction } from './Transaction'
import { CurrencyUtils } from '../CurrencyUtils/CurrencyUtils'
import { CurrencyAmount } from '../CurrencyUtils'
import { CurrencyInfo } from '../CurrencyInfo'

export abstract class CurrencyWallet<CI extends CurrencyInfo> {
    public readonly utils: CurrencyUtils<CI>
    protected transports: Transports

    protected constructor(utils: CurrencyUtils<CI>, transports: Transports) {
        this.utils = utils
        this.transports = transports
    }

    abstract getAddress(): Promise<string>

    abstract getBalance(): Promise<{
        confirmed: CurrencyAmount<CI>
        unconfirmed: CurrencyAmount<CI>
    }>

    abstract createTransfer(
        toAddress: Address,
        amount: CurrencyAmount<CI>,
    ): Promise<Transaction<CI>>

    async getPublicKey() {
        return (await this.transports.getPublicKeyProvider(this.utils.currencyInfo.id))()
    }

    async getPrivateKey() {
        return (await this.transports.getPrivateKeyProvider(this.utils.currencyInfo.id))()
    }

    async signMessage(message: string | Uint8Array): Promise<string> {
        return this.utils.signMessage(message, await this.getPrivateKey())
    }
}
