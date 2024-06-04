import {ConfirmedTransaction} from '../Currency'
import {ChainGateClient} from 'chaingate-client'
import {ConsumeFunction} from '../../../CGDriver'

export class ConfirmedEthereumTransaction extends ConfirmedTransaction{
    public readonly txId: string
    private readonly chainGateClient: ChainGateClient

    constructor(chainGateClient: ChainGateClient, txId: string) {
        super()
        this.chainGateClient = chainGateClient
        this.txId = txId
    }

    async isConfirmed(): Promise<boolean> {
        try{
            const transactionDetails = await ConsumeFunction(
                this.chainGateClient.Ethereum,
                this.chainGateClient.Ethereum.transactionDetails,
                this.txId)
            return transactionDetails.blockHeight != null
        }catch (_ex){
            return false
        }
    }
}
