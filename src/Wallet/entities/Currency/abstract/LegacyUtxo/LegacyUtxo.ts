import {UtxoApi} from 'chaingate-client'
import {Address} from '../../../Address'
import {Utxo} from '../Utxo/Utxo'
import {HDPrivateKeySign, PrivateKeySign} from '../../CurrencyParams'
import {CurrencyInfo} from '../../CurrencyInfo'
import {NetworkParams} from '../Utxo/NetworkParams'
import {CurrencyAmount} from '../../CurrencyAmount'
import {UtxoPreparedTransaction} from '../Utxo/UtxoPreparedTransaction'
import {
    LegacyUtxoPreparedTransaction
} from './LegacyUtxoPreparedTransaction'

export abstract class LegacyUtxo<DefaultUnit extends string> extends Utxo<DefaultUnit> {
    declare currencyParams: PrivateKeySign | HDPrivateKeySign

    protected constructor(currencyInfo: CurrencyInfo, api: UtxoApi, currencyParams: PrivateKeySign | HDPrivateKeySign, networkParams: NetworkParams) {
        super(currencyInfo, api, currencyParams, networkParams)
    }

    async createTransfer(toAddress: Address, amount: CurrencyAmount): Promise<UtxoPreparedTransaction<DefaultUnit>> {
        let privateKeyProvider
        if(this.currencyParams.signMode == 'privateKey') privateKeyProvider = this.currencyParams.getPrivateKey
        else if (this.currencyParams.signMode == 'hdPrivateKey') {
            const derivationPath = this.currencyParams.getDerivationPath(this.currencyInfo)
            privateKeyProvider = this.currencyParams.getPrivateKey.bind(this.currencyParams, derivationPath)
        }

        return new LegacyUtxoPreparedTransaction(
            this.api,
            this.currencyParams,
            this.currencyInfo,
            await this.getAddress(),
            toAddress,
            amount,
            this.networkParams,
            privateKeyProvider
        )
    }
}
