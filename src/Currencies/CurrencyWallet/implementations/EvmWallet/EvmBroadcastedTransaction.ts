import { BroadcastedTransaction } from '../../BroadcastedTransaction'
import { EvmCurrencyUtils } from '../../../CurrencyUtils/abstract/EvmCurrencyUtils'
import { EvmCurrencyInfo } from '../../../CurrencyInfo'

export class EvmBroadcastedTransaction<CI extends EvmCurrencyInfo> extends BroadcastedTransaction {
    public readonly transactionId: string
    private readonly utils: EvmCurrencyUtils<CI>

    constructor(transactionId: string) {
        super()
        this.transactionId = transactionId
    }

    async isConfirmed(): Promise<boolean> {
        try {
            const transactionDetails = await this.utils.transactionDetails(this.transactionId)
            return transactionDetails.blockHeight != null
        } catch (_ex) {
            return false
        }
    }
}
