import {UtxoApi} from 'chaingate-client'
import {Address} from '../../../Address'
import {Utxo} from '../Utxo/Utxo'
import {CurrencyProviders} from '../../CurrencyProviders'
import {CurrencyInfo} from '../../CurrencyInfo'
import {NetworkParams} from '../Utxo/NetworkParams'
import {CurrencyAmount} from '../../CurrencyAmount'
import {UtxoPreparedTransaction} from '../Utxo/UtxoPreparedTransaction'
import {
    LegacyUtxoPreparedTransaction
} from './LegacyUtxoPreparedTransaction'

export abstract class LegacyUtxo<DefaultUnit extends string> extends Utxo<DefaultUnit> {
    declare currencyProviders: CurrencyProviders

    protected constructor(currencyInfo: CurrencyInfo, api: UtxoApi, currencyProviders: CurrencyProviders, networkParams: NetworkParams) {
        super(currencyInfo, api, currencyProviders, networkParams)
    }

    async createTransfer(toAddress: Address, amount: CurrencyAmount): Promise<UtxoPreparedTransaction<DefaultUnit>> {
        const privateKeyProvider = await this.currencyProviders.getPrivateKeyProvider(this.currencyInfo)
        return new LegacyUtxoPreparedTransaction(
            this.api,
            this.currencyProviders,
            this.currencyInfo,
            await this.getAddress(),
            toAddress,
            amount,
            this.networkParams,
            privateKeyProvider
        )
    }
}
