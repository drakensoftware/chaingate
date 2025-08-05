import { BroadcastedTransaction } from '../../BroadcastedTransaction'
import { UtxoCurrencyUtils } from '../../../CurrencyUtils/abstract/UtxoCurrencyUtils/UtxoCurrencyUtils'
import { CurrencyInfo } from '../../../CurrencyInfo'

export class UtxoBroadcastedTransaction<CI extends CurrencyInfo> extends BroadcastedTransaction {
    public readonly transactionId: string
    private readonly utils: UtxoCurrencyUtils<CI>

    constructor(utils: UtxoCurrencyUtils<CI>, txId: string) {
        super()
        this.transactionId = txId
        this.utils = utils
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
