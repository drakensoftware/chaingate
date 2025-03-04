import {ConsumeFunction} from '../../../../../CGDriver'
import {BitcoinApi} from 'chaingate-client'
import {ConfirmedTransaction} from '../../ConfirmedTransaction'

export class UtxoConfirmedTransaction extends ConfirmedTransaction{
    public readonly txId: string
    private readonly api: BitcoinApi

    constructor(api: BitcoinApi, txId: string) {
        super()
        this.api = api
        this.txId = txId
    }

    async isConfirmed(): Promise<boolean> {
        try{
            const transactionDetails = await ConsumeFunction(
                this.api,
                this.api.transactionDetails,
                this.txId)
            return transactionDetails.blockHeight != null
        }catch (_ex){
            return false
        }
    }
}
