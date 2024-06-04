import {ConfirmedTransaction, FeeGrade, PossibleFees, PreparedTransaction} from '../Currency'
import {EthereumFee} from './EthereumFee'
import Decimal from 'decimal.js'
import {ChainGateClient} from 'chaingate-client'
import {ethers, SigningKey, TransactionRequest} from 'ethers'
import {ConfirmedEthereumTransaction} from './ConfirmedEthereumTransaction'
import EthereumCurrencyAmount from './EthereumCurrencyAmount'
import {ConsumeFunction} from '../../../CGDriver'
import {Ethereum} from './index'

export class PreparedEthereumTransaction extends PreparedTransaction{
    private readonly chainGateClient: ChainGateClient
    private readonly ethereum: Ethereum
    private readonly fromAddress: string
    private readonly toAddress: string
    private readonly amount: EthereumCurrencyAmount
    private readonly data: string
    readonly possibleFees: PossibleFees<EthereumFee>

    constructor(
        chainGateClient: ChainGateClient,
        ethereum: Ethereum,
        fromAddress: string,
        toAddress: string,
        amount: EthereumCurrencyAmount,
        possibleFees: PossibleFees<EthereumFee>,
        data?: string){
        super()
        this.chainGateClient = chainGateClient
        this.ethereum = ethereum
        this.fromAddress = fromAddress
        this.toAddress = toAddress
        this.amount = amount
        this.possibleFees = possibleFees
        this.data = data
    }

    async confirm(fee: FeeGrade | EthereumFee): Promise<ConfirmedTransaction> {
        if (!(fee instanceof EthereumFee)) fee = this.possibleFees[fee]

        const signer = new ethers.Wallet(new SigningKey((await this.ethereum.getPrivateKey()).raw))

        const nonce = new Decimal(await ConsumeFunction(
            this.chainGateClient.Ethereum,
            this.chainGateClient.Ethereum.addressTransactionCount,
            this.fromAddress
        ))

        const gasLimit = new Decimal(await ConsumeFunction(
            this.chainGateClient.Ethereum,
            this.chainGateClient.Ethereum.estimateGas,
            this.fromAddress,
            this.toAddress,
            nonce.toString(),
            this.amount.eth.toString(),
            this.data ? this.data.toString() : '0x'
        ))

        const tx: TransactionRequest = {
            from: this.fromAddress,
            to: this.toAddress,
            maxFeePerGas: ethers.toBigInt(fee.maxFeePerGas.wei.toString()),
            maxPriorityFeePerGas: ethers.toBigInt(fee.maxPriorityFeePerGas.wei.toString()),
            value: ethers.toBigInt(this.amount.wei.toString()),
            data: this.data ?? undefined,
            nonce: nonce.toNumber(),
            gasLimit: ethers.toBigInt(gasLimit.toString()),
            chainId: 0x1
        }

        const txSigned = await signer.signTransaction(tx)

        const broadcastedTx = await ConsumeFunction(
            this.chainGateClient.Ethereum,
            this.chainGateClient.Ethereum.broadcastTransaction,
            {'transactionRaw': txSigned}
        )

        return new ConfirmedEthereumTransaction(this.chainGateClient, broadcastedTx.txId as string)
    }
}
