import {ConfirmedTransaction} from '../Currency'
import {BitcoinApi} from 'chaingate-client'
import {ConsumeFunction} from '../../../CGDriver'

export class ConfirmedBitcoinTransaction extends ConfirmedTransaction{
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
