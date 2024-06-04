import {FeeGrade, PossibleFees, PreparedTransaction} from '../Currency'
import {Transaction} from 'bitcore-lib'
import {ConfirmedBitcoinTransaction} from './ConfirmedBitcoinTransfer'
import {Utils} from '../../../Utils'
import {ChainGateClient} from 'chaingate-client'
import {BitcoinFee, FeeKind} from './BitcoinFee'
import {BitcoinUtils} from './BitcoinUtils'
import BitcoinCurrencyAmount from './BitcoinCurrencyAmount'
import {Bitcoin} from './index'
import {ConsumeFunction} from '../../../CGDriver'
import {UTXO} from './Bitcoin'
import UnspentOutput = Transaction.UnspentOutput;

export class PreparedBitcoinTransfer extends PreparedTransaction {
    private readonly chaingateClient: ChainGateClient
    private readonly bitcoin: Bitcoin
    private fromAddress: string
    private toAddress: string
    private amount: BitcoinCurrencyAmount
    private utxos: Array<UTXO>
    readonly possibleFees: PossibleFees<BitcoinFee>

    constructor(chainGateClient: ChainGateClient,
        bitcoin: Bitcoin,
        fromAddress: string,
        toAddress: string,
        amount: BitcoinCurrencyAmount,
        utxos: Array<UTXO>,
        possibleFees: PossibleFees<BitcoinFee>
    ) {
        super()
        this.chaingateClient = chainGateClient
        this.bitcoin = bitcoin
        this.fromAddress = fromAddress
        this.toAddress = toAddress
        this.amount = amount
        this.utxos = utxos
        this.possibleFees = possibleFees
    }

    async confirm(fee: FeeGrade | BitcoinFee): Promise<ConfirmedBitcoinTransaction> {
        if (!(fee instanceof BitcoinFee)) fee = this.possibleFees[fee]

        const bitcoreUtxo = this.utxos.map(t => new UnspentOutput({
            address: this.fromAddress,
            txId: t.txid,
            outputIndex: t.n,
            script: Utils.bytesToHex(t.script, false),
            satoshis: BitcoinUtils.toSatoshi(t.amount).toNumber(),
        }))

        let transaction = new Transaction()
            .from(bitcoreUtxo)
            .to(this.toAddress, this.amount.satoshis.toNumber())
            .change(this.fromAddress)

        if(fee.kind == FeeKind.FeeAmount)
            transaction = transaction.fee(fee.fee.satoshis.toNumber())
        if(fee.kind == FeeKind.FeePerByte)
            transaction = transaction.feePerKb(fee.fee.satoshis.mul(1_024).toNumber())

        transaction = transaction.sign(Utils.bytesToHex(((await this.bitcoin.getPrivateKey()).raw), false))

        const broadcastTx = await ConsumeFunction(
            this.chaingateClient.Bitcoin,
            this.chaingateClient.Bitcoin.broadcastTransaction,
            {transactionRaw: transaction.serialize()}
        )

        return new ConfirmedBitcoinTransaction(this.chaingateClient, broadcastTx.txId)
    }

}
