import {ChainGateClient, UtxoApi} from 'chaingate-client'
import {UtxoFee} from './UtxoFee'
import {bytesToHex, hexToBytes} from '../../../../../Utils/Utils'
import {ConsumeFunction} from '../../../../../CGDriver'
import Decimal from 'decimal.js'
import * as btc from '@scure/btc-signer'
import {Address} from '../../../Address'
import {CurrencyAmount} from '../../CurrencyAmount'
import {Txo} from './Txo'
import {CurrencyPreparedTransaction} from '../../CurrencyPreparedTransaction'
import {FeeLevel} from '../../FeeLevel'
import {NetworkParams} from './NetworkParams'
import {PrivateKeyProvider} from '../../CurrencyProviders'
import {CurrencyInfo} from '../../CurrencyInfo'
import {UtxoConfirmedTransaction} from './UtxoConfirmedTransaction'
import {toBase, toSatoshi} from './UtxoUtils'

interface FeeRate {
    feePerKb: CurrencyAmount;
    confirmationTimeSecs: number;
}

interface FeeRates {
    low: FeeRate;
    normal: FeeRate;
    high: FeeRate;
    maximum: FeeRate;
}

type UtxoApiState = {
    page: number;
    utxos: Txo[];
    crawled: boolean
}

export type TxVout = {
    amount: Decimal,
    address: Address
}

type CreateTransactionResult = {
    vins: Txo[],
    vouts: TxVout[]
    feeBase: Decimal
}

export abstract class UtxoPreparedTransaction<DefaultUnit extends string> extends CurrencyPreparedTransaction {
    private readonly api: UtxoApi
    private readonly currencyInfo: CurrencyInfo
    private readonly client: ChainGateClient
    declare protected _suggestedFees: Record<FeeLevel, UtxoFee>

    private readonly state: UtxoApiState

    protected readonly privateKeyProvider: PrivateKeyProvider
    protected readonly networkParams: NetworkParams

    protected constructor(
        api: UtxoApi,
        client: ChainGateClient,
        currencyInfo: CurrencyInfo,
        fromAddress: Address,
        toAddress: Address,
        amount: CurrencyAmount,
        networkParams: NetworkParams,
        privateKeyProvider: PrivateKeyProvider) {
        super(fromAddress, toAddress, amount)
        this.api = api
        this.client = client
        this.currencyInfo = currencyInfo
        this.state = {utxos: [], page: 0, crawled: false}
        this.networkParams = networkParams
        this.privateKeyProvider = privateKeyProvider
    }

    async broadcast(fee: FeeLevel | UtxoFee): Promise<UtxoConfirmedTransaction> {
        if(typeof fee === 'string') fee = (this._suggestedFees ?? await this.buildSuggestedFees())[fee] // Param passed is fee level

        await this.findUtxos(fee.feePerKb)
        const transaction = this.createTransaction(fee.feePerKb)

        const txSigned = await this.sign(transaction.vins, transaction.vouts)

        // Broadcast transaction
        const broadcastTx = await ConsumeFunction(
            this.api,
            this.api.broadcastTransaction,
            { transactionRaw: bytesToHex(txSigned, false) }
        )

        return new UtxoConfirmedTransaction(this.api, broadcastTx.txId)
    }

    async fee(fee: string | CurrencyAmount, unit: `${DefaultUnit}/kB` | `${DefaultUnit}/byte` | 'satoshi/kB' | 'satoshi/byte'): Promise<UtxoFee> {
        if(typeof fee == 'string') fee = new CurrencyAmount(this.currencyInfo, new Decimal(fee), this.client)

        const feeBase = fee.baseAmount
        let feePerKb: CurrencyAmount

        if(unit == 'satoshi/kB') feePerKb = new CurrencyAmount(this.currencyInfo, new Decimal(feeBase), this.client)
        else if(unit == 'satoshi/byte') feePerKb = new CurrencyAmount(this.currencyInfo, new Decimal(feeBase).div(1e8).mul(1000), this.client)
        else if(unit ==  `${this.currencyInfo.symbol}/kB`) feePerKb = new CurrencyAmount(this.currencyInfo, new Decimal(feeBase), this.client)
        else if(unit ==  `${this.currencyInfo.symbol}/byte`) feePerKb = new CurrencyAmount(this.currencyInfo, new Decimal(feeBase).mul(1000), this.client)
        else throw new Error('Unsupported unit')

        return this.feePerKb(feePerKb, null)
    }

    protected async buildSuggestedFees(): Promise<Record<FeeLevel, UtxoFee>>{
        const feeRates = await this.retrieveFeeRates()

        return {
            low: await this.feePerKb(feeRates.low.feePerKb, feeRates.low.confirmationTimeSecs),
            normal: await this.feePerKb(feeRates.normal.feePerKb, feeRates.normal.confirmationTimeSecs),
            high: await this.feePerKb(feeRates.high.feePerKb, feeRates.high.confirmationTimeSecs),
            maximum: await this.feePerKb(feeRates.maximum.feePerKb, feeRates.maximum.confirmationTimeSecs)
        }
    }

    private async retrieveFeeRates(): Promise<FeeRates>{
        const feeRateResponse = await ConsumeFunction(this.api, this.api.feeRate)

        return {
            low: {
                feePerKb: new CurrencyAmount(this.currencyInfo, new Decimal(feeRateResponse.low.feePerKb), this.client),
                confirmationTimeSecs: feeRateResponse.low.confirmationTimeSecs
            },
            normal: {
                feePerKb: new CurrencyAmount(this.currencyInfo, new Decimal(feeRateResponse.normal.feePerKb), this.client),
                confirmationTimeSecs: feeRateResponse.normal.confirmationTimeSecs
            },
            high: {
                feePerKb: new CurrencyAmount(this.currencyInfo, new Decimal(feeRateResponse.high.feePerKb), this.client),
                confirmationTimeSecs: feeRateResponse.high.confirmationTimeSecs
            },
            maximum: {
                feePerKb: new CurrencyAmount(this.currencyInfo, new Decimal(feeRateResponse.maximum.feePerKb), this.client),
                confirmationTimeSecs: feeRateResponse.maximum.confirmationTimeSecs
            }
        }
    }

    private async feePerKb(
        feePerKb: CurrencyAmount,
        confirmationTimeSecs?: number
    ) {
        await this.findUtxos(feePerKb)
        const selected = this.createTransaction(feePerKb)

        return new UtxoFee(
            feePerKb,
            true,
            !!selected,
            confirmationTimeSecs,
            selected ? new CurrencyAmount(this.currencyInfo, selected?.feeBase, this.client) : null
        )
    }

    private async findUtxos(
        feePerKb: CurrencyAmount
    ): Promise<void> {
        // 1) Check if the provided UTXOs already suffice
        if (this.createTransaction(feePerKb)) {
            return
        }

        // 2) Otherwise, keep fetching until we either have enough or get no more UTXOs
        while (!this.state.crawled) {
            const utxosByAddress = await ConsumeFunction(
                this.api,
                this.api.utxosByAddress,
                this.fromAddress,
                this.state.page
            )

            // If no new UTXOs are returned, break out of loop
            if (utxosByAddress.utxos.length === 0) {
                this.state.crawled = true
                break
            }

            // Push all new UTXOs into the state's UTXOs array
            for (const utxo of utxosByAddress.utxos) {
                this.state.utxos.push({
                    txid: utxo.txid,
                    amount: new Decimal(utxo.amount),
                    script: hexToBytes(utxo.script),
                    n: utxo.n,
                })
            }

            // Check again if we now have enough
            if (this.createTransaction(feePerKb)) break

            // Increment the page so next time we fetch the next "page"
            this.state.page++
        }
    }

    private createTransaction(
        feePerKb: CurrencyAmount
    ) : CreateTransactionResult | null  {
        // IMPROVE: Do not allow dust outputs

        const vins = this.state.utxos.map(utxo => ({
            txid: hexToBytes(utxo.txid),
            index: utxo.n,
            witnessUtxo: {
                script: utxo.script,
                amount: BigInt(toSatoshi(new Decimal(utxo.amount.toString())).toString())
            }
        }))

        const vouts = [
            {
                address: this.toLegacyAddress(this.toAddress),
                amount: BigInt(this.amount.minimalUnitAmount.toString())
            }
        ]

        const selected = btc.selectUTXO(vins, vouts, 'default', {
            changeAddress: this.toLegacyAddress(this.fromAddress),
            feePerByte: BigInt(feePerKb.minimalUnitAmount.div(1000).round().toString()),
            bip69: true,
            createTx: true,
            allowLegacyWitnessUtxo: true,
            network: this.networkParams
        })

        if(!selected) return null

        return {
            vins: selected.inputs.map(input => ({
                txid: bytesToHex(input.txid, false),
                amount: toBase(input.witnessUtxo.amount),
                n: input.index,
                script: input.witnessUtxo.script
            })),
            vouts: selected.outputs.map(output => {
                if(!('address' in output)) throw new Error()
                return {
                    amount: toBase(output.amount),
                    address: output.address
                }
            }),
            feeBase: toBase(selected.fee)
        }
    }

    protected abstract toLegacyAddress(address: Address): string
    protected abstract sign(inputs: Txo[], outputs: TxVout[]) : Promise<Uint8Array>
}
