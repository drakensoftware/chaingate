import { Address } from '../../Wallet/entities/Address'
import { FeeLevel } from './FeeLevel'
import { BroadcastedTransaction } from './BroadcastedTransaction'
import { CurrencyAmount } from '../CurrencyUtils'
import { CurrencyFee } from './CurrencyFee'
import { CurrencyInfo } from '../CurrencyInfo'

export abstract class Transaction<CI extends CurrencyInfo> {
    public readonly fromAddress
    public readonly toAddress
    public readonly amount

    protected constructor(fromAddress: Address, toAddress: Address, amount: CurrencyAmount<CI>) {
        this.fromAddress = fromAddress
        this.toAddress = toAddress
        this.amount = amount
    }

    protected abstract buildSuggestedFees(): Promise<Record<FeeLevel, CurrencyFee<CI>>>

    protected _suggestedFees: Record<FeeLevel, CurrencyFee<CI>>
    public async getSuggestedFees(): Promise<Record<FeeLevel, CurrencyFee<CI>>> {
        if (this._suggestedFees) return this._suggestedFees
        else {
            this._suggestedFees = await this.buildSuggestedFees()
            return this._suggestedFees
        }
    }

    abstract broadcast(fee: FeeLevel | unknown): Promise<BroadcastedTransaction>
    abstract fee(...args: unknown[]): Promise<CurrencyFee<CI>>
}
