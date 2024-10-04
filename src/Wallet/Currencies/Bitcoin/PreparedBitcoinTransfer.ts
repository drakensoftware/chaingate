import {CurrencyAmount, FeeGrade, PossibleFees, PreparedTransaction} from '../Currency'
import {Transaction} from 'bitcore-lib'
import {ConfirmedBitcoinTransaction} from './ConfirmedBitcoinTransfer'
import {Utils} from '../../../Utils'
import {BitcoinApi} from 'chaingate-client'
import {BitcoinFee, FeeKind} from './BitcoinFee'
import {BitcoinUtils} from './BitcoinUtils'
import {Bitcoin} from './index'
import {ConsumeFunction} from '../../../CGDriver'
import {UTXO} from './Bitcoin'
import UnspentOutput = Transaction.UnspentOutput;

export class PreparedBitcoinTransfer extends PreparedTransaction {
    private readonly api: BitcoinApi
    private readonly bitcoin: Bitcoin
    private fromAddress: string
    private toAddress: string
    private amount: CurrencyAmount
    private utxos: Array<UTXO>
    readonly possibleFees: PossibleFees<BitcoinFee>

    constructor(api: BitcoinApi,
        bitcoin: Bitcoin,
        fromAddress: string,
        toAddress: string,
        amount: CurrencyAmount,
        utxos: Array<UTXO>,
        possibleFees: PossibleFees<BitcoinFee>
    ) {
        super()
        this.api = api
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
            .to(this.toAddress, this.amount.minimalUnitAmount.toNumber())
            .change(this.fromAddress)

        if(fee.kind == FeeKind.FeeAmount)
            transaction = transaction.fee(fee.fee.minimalUnitAmount.toNumber())
        if(fee.kind == FeeKind.FeePerByte)
            transaction = transaction.feePerKb(fee.fee.minimalUnitAmount.mul(1_024).toNumber())

        transaction = transaction.sign(Utils.bytesToHex(((await this.bitcoin.getPrivateKey()).raw), false))

        // eslint-disable-next-line @typescript-eslint/ban-ts-comment
        // @ts-expect-error
        const serializedTx = transaction.serialize({disableDustOutputs: true})

        const broadcastTx = await ConsumeFunction(
            this.api,
            this.api.broadcastTransaction,
            {transactionRaw: serializedTx}
        )

        return new ConfirmedBitcoinTransaction(this.api, broadcastTx.txId)
    }

}
