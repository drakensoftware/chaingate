import {UtxoApi} from 'chaingate-client'
import Decimal from 'decimal.js'
import {ConsumeFunction} from '../../../../../CGDriver'
import {Address} from '../../../Address'
import {Currency} from '../../Currency'
import {NetworkParams} from './NetworkParams'
import {CurrencyInfo} from '../../CurrencyInfo'
import {CurrencyAmount} from '../../CurrencyAmount'
import {UtxoPreparedTransaction} from './UtxoPreparedTransaction'
import {CannotParseAmount} from '../../errors'
import {AddressHistory} from './AddressHistory'
import {CurrencyProviders} from '../../CurrencyProviders'

export abstract class Utxo<DefaultUnit extends string> extends Currency {
    declare protected readonly api: UtxoApi

    protected readonly networkParams: NetworkParams

    protected constructor(currencyInfo: CurrencyInfo, api: UtxoApi, currencyProviders: CurrencyProviders, networkParams: NetworkParams) {
        super(currencyInfo, api, currencyProviders)
        this.networkParams = networkParams
    }

    abstract getAddress() : Promise<string>

    abstract createTransfer(toAddress: Address, amount: CurrencyAmount): Promise<UtxoPreparedTransaction<DefaultUnit>>

    async getBalance(address?: string): Promise<{confirmed: CurrencyAmount, unconfirmed: CurrencyAmount}>{
        const balance = await ConsumeFunction(
            this.api,
            this.api.addressBalance,
            address ?? await this.getAddress())

        return {
            confirmed: new CurrencyAmount(this.currencyInfo, new Decimal(balance.confirmed)),
            unconfirmed: new CurrencyAmount(this.currencyInfo, new Decimal(balance.unconfirmed))
        }
    }

    async amount(amountStr: string, unit: DefaultUnit | 'satoshi'): Promise<CurrencyAmount> {
        try{
            switch (unit){
            default: return new CurrencyAmount(this.currencyInfo, new Decimal(amountStr))
            case 'satoshi': return new CurrencyAmount(this.currencyInfo, new Decimal(amountStr).div(100_000_000))
            }
        } catch (_ex) { throw new CannotParseAmount(amountStr) }
    }

    async addressHistory(page: number): Promise<AddressHistory>{
        return (await ConsumeFunction(this.api, this.api.addressHistory, this.getAddress(), page)).transactions
    }
}
