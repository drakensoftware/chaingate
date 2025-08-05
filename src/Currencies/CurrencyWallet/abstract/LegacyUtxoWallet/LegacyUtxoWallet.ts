import { Address } from '../../../../Wallet/entities/Address'
import { UtxoWallet } from '../UtxoWallet/UtxoWallet'
import { Transports } from '../../Transports'
import { NetworkParams } from '../UtxoWallet/NetworkParams'
import { UtxoTransaction } from '../UtxoWallet/UtxoTransaction'
import { LegacyUtxoPreparedTransaction } from './LegacyUtxoPreparedTransaction'
import { CurrencyInfo } from '../../../CurrencyInfo'
import { CurrencyAmount } from '../../../CurrencyUtils'
import { UtxoCurrencyUtils } from '../../../CurrencyUtils/abstract/UtxoCurrencyUtils/UtxoCurrencyUtils'

export abstract class LegacyUtxoWallet<CI extends CurrencyInfo> extends UtxoWallet<CI> {
    protected constructor(
        utils: UtxoCurrencyUtils<CI>,
        transports: Transports,
        networkParams: NetworkParams,
    ) {
        super(utils, transports, networkParams)
    }

    async createTransfer(
        toAddress: Address,
        amount: CurrencyAmount<CI>,
    ): Promise<UtxoTransaction<CI>> {
        const privateKeyProvider = await this.transports.getPrivateKeyProvider(
            this.utils.currencyInfo.id,
        )
        return new LegacyUtxoPreparedTransaction(
            this.utils,
            await this.getAddress(),
            toAddress,
            amount,
            this.networkParams,
            privateKeyProvider,
        )
    }
}
