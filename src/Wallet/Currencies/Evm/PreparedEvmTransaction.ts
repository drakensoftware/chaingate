import {ConfirmedTransaction, CurrencyAmount, FeeGrade, PossibleFees, PreparedTransaction} from '../Currency'
import {EvmFee} from './EvmFee'
import Decimal from 'decimal.js'
import {EvmApi} from 'chaingate-client'
import {ethers, SigningKey, TransactionRequest} from 'ethers'
import {ConfirmedEvmTransaction} from './ConfirmedEvmTransaction'
import {ConsumeFunction} from '../../../CGDriver'
import {Evm} from './Evm'

export class PreparedEvmTransaction extends PreparedTransaction{
    private readonly api: EvmApi
    private readonly ethereum: Evm
    private readonly fromAddress: string
    private readonly toAddress: string
    private readonly amount: CurrencyAmount
    private readonly chainId: number
    private readonly data: string
    readonly possibleFees: PossibleFees<EvmFee>

    constructor(
        api: EvmApi,
        evm: Evm,
        fromAddress: string,
        toAddress: string,
        amount: CurrencyAmount,
        possibleFees: PossibleFees<EvmFee>,
        chainId: number,
        data?: string){
        super()
        this.api = api
        this.ethereum = evm
        this.fromAddress = fromAddress
        this.toAddress = toAddress
        this.amount = amount
        this.possibleFees = possibleFees
        this.chainId = chainId
        this.data = data
    }

    async confirm(fee: FeeGrade | EvmFee): Promise<ConfirmedTransaction> {
        if (!(fee instanceof EvmFee)) fee = this.possibleFees[fee]

        const signer = new ethers.Wallet(new SigningKey((await this.ethereum.getPrivateKey()).raw))

        const nonce = new Decimal(await ConsumeFunction(
            this.api,
            this.api.addressTransactionCount,
            this.fromAddress
        ))

        const gasLimit = new Decimal(await ConsumeFunction(
            this.api,
            this.api.estimateGas,
            this.fromAddress,
            this.toAddress,
            nonce.toString(),
            this.amount.baseAmount.toString(),
            this.data ? this.data.toString() : '0x'
        ))

        const tx: TransactionRequest = {
            from: this.fromAddress,
            to: this.toAddress,
            maxFeePerGas: ethers.toBigInt(fee.maxFeePerGas.minimalUnitAmount.toString()),
            maxPriorityFeePerGas: ethers.toBigInt(fee.maxPriorityFeePerGas.minimalUnitAmount.toString()),
            value: ethers.toBigInt(this.amount.minimalUnitAmount.toString()),
            data: this.data ?? undefined,
            nonce: nonce.toNumber(),
            gasLimit: ethers.toBigInt(gasLimit.toString()),
            chainId: this.chainId
        }

        const txSigned = await signer.signTransaction(tx)

        const broadcastedTx = await ConsumeFunction(
            this.api,
            this.api.broadcastTransaction,
            {'transactionRaw': txSigned}
        )

        return new ConfirmedEvmTransaction(this.api, broadcastedTx.txId as string)
    }
}
