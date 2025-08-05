import { Address } from '../../../../Wallet/entities/Address'
import { CurrencyWallet } from '../../CurrencyWallet'
import { NetworkParams } from './NetworkParams'
import { UtxoTransaction } from './UtxoTransaction'
import { Transports } from '../../Transports'
import { UtxoCurrencyUtils } from '../../../CurrencyUtils/abstract/UtxoCurrencyUtils/UtxoCurrencyUtils'
import { CurrencyAmount } from '../../../CurrencyUtils'
import { CurrencyInfo } from '../../../CurrencyInfo'

export abstract class UtxoWallet<CI extends CurrencyInfo> extends CurrencyWallet<CI> {
    declare utils: UtxoCurrencyUtils<CI>
    protected readonly networkParams: NetworkParams

    protected constructor(
        utils: UtxoCurrencyUtils<CI>,
        transports: Transports,
        networkParams: NetworkParams,
    ) {
        super(utils, transports)
        this.networkParams = networkParams
    }

    abstract createTransfer(
        toAddress: Address,
        amount: CurrencyAmount<CI>,
    ): Promise<UtxoTransaction<CI>>

    async getBalance() {
        return await this.utils.addressBalance(await this.getAddress())
    }

    async getHistory(page = 0) {
        return await this.utils.addressHistory(await this.getAddress(), page)
    }
}
