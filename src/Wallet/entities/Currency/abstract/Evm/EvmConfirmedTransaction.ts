import {EvmApi} from 'chaingate-client'
import {ConsumeFunction} from '../../../../../CGDriver'
import {ConfirmedTransaction} from '../../ConfirmedTransaction'

export class EvmConfirmedTransaction extends ConfirmedTransaction{
    public readonly txId: string
    private readonly api: EvmApi

    constructor(api: EvmApi, txId: string) {
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
