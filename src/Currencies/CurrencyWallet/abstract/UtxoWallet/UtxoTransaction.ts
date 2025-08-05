import { UtxoFee } from './UtxoFee'
import { bytesToHex, hexToBytes } from '../../../../InternalUtils/Utils'

import * as btc from '@scure/btc-signer'
import { Address } from '../../../../Wallet/entities/Address'
import { Transaction } from '../../Transaction'
import { FeeLevel } from '../../FeeLevel'
import { NetworkParams } from './NetworkParams'
import { PrivateKeyProvider } from '../../Transports'
import { UtxoBroadcastedTransaction } from './UtxoBroadcastedTransaction'
import { toBase, toSatoshi } from './UtxoUtils'
import { toDecimal } from '../../../../InternalUtils/NumberLike'
import { CurrencyAmount } from '../../../CurrencyUtils'
import { UtxoCurrencyUtils } from '../../../CurrencyUtils/abstract/UtxoCurrencyUtils/UtxoCurrencyUtils'
import { CurrencyInfo } from '../../../CurrencyInfo'
import Decimal from 'decimal.js'

type DefaultUnit<T extends { symbol: string }> = T['symbol']

export type Txo = {
    txid: string
    amount: Decimal
    n: number
    script: Uint8Array
}

type UtxoApiState = {
    page: number
    utxos: Txo[]
    crawled: boolean
}

export type TxVout = {
    amount: Decimal
    address: Address
}

type CreateTransactionResult = {
    vins: Txo[]
    vouts: TxVout[]
    feeBase: Decimal
}

export abstract class UtxoTransaction<CI extends CurrencyInfo> extends Transaction<CI> {
    private readonly utils: UtxoCurrencyUtils<CI>
    declare protected _suggestedFees: Record<FeeLevel, UtxoFee<CI>>

    private readonly state: UtxoApiState

    protected readonly privateKeyProvider: PrivateKeyProvider
    protected readonly networkParams: NetworkParams

    protected constructor(
        utils: UtxoCurrencyUtils<CI>,
        fromAddress: Address,
        toAddress: Address,
        amount: CurrencyAmount<CI>,
        networkParams: NetworkParams,
        privateKeyProvider: PrivateKeyProvider,
    ) {
        super(fromAddress, toAddress, amount)
        this.utils = utils
        this.state = { utxos: [], page: 0, crawled: false }
        this.networkParams = networkParams
        this.privateKeyProvider = privateKeyProvider
    }

    async broadcast(fee: FeeLevel | UtxoFee<CI>): Promise<UtxoBroadcastedTransaction<CI>> {
        if (typeof fee === 'string')
            fee = (this._suggestedFees ?? (await this.buildSuggestedFees()))[fee] // Param passed is fee level

        await this.findUtxos(fee.feePerKb)
        const transaction = this.createTransaction(fee.feePerKb)

        const txSigned = await this.sign(transaction.vins, transaction.vouts)

        // Broadcast transaction
        const broadcastTx = await this.utils.broadcastTransaction(txSigned)

        return new UtxoBroadcastedTransaction(this.utils, broadcastTx.transactionId)
    }

    async fee(
        fee: string | CurrencyAmount<CI>,
        unit: `${DefaultUnit<CI>}/kB` | `${DefaultUnit<CI>}/byte` | 'satoshi/kB' | 'satoshi/byte',
    ): Promise<UtxoFee<CI>> {
        const currencySymbol = this.utils.currencyInfo.symbol

        if (typeof fee == 'string') fee = this.utils.amount(toDecimal(fee), currencySymbol)

        const feeBase = fee.baseAmount
        let feePerKb: CurrencyAmount<CI>

        if (unit == 'satoshi/kB') feePerKb = this.utils.amount(feeBase, 'btc')
        else if (unit == 'satoshi/byte')
            feePerKb = this.utils.amount(toDecimal(feeBase).div(1e8).mul(1000), currencySymbol)
        else if (unit == `${this.utils.currencyInfo.symbol}/kB`)
            feePerKb = this.utils.amount(toDecimal(feeBase), currencySymbol)
        else if (unit == `${this.utils.currencyInfo.symbol}/byte`)
            feePerKb = this.utils.amount(toDecimal(feeBase).mul(1000), currencySymbol)
        else throw new Error('Unsupported unit')

        return this.feePerKb(feePerKb, null)
    }

    protected async buildSuggestedFees(): Promise<Record<FeeLevel, UtxoFee<CI>>> {
        const feeRates = await this.utils.getFeeRate()

        return {
            low: await this.feePerKb(feeRates.low.feePerKb, feeRates.low.confirmationTimeSecs),
            normal: await this.feePerKb(
                feeRates.normal.feePerKb,
                feeRates.normal.confirmationTimeSecs,
            ),
            high: await this.feePerKb(feeRates.high.feePerKb, feeRates.high.confirmationTimeSecs),
            maximum: await this.feePerKb(
                feeRates.maximum.feePerKb,
                feeRates.maximum.confirmationTimeSecs,
            ),
        }
    }

    private async feePerKb(feePerKb: CurrencyAmount<CI>, confirmationTimeSecs?: number) {
        const currencySymbol = this.utils.currencyInfo.symbol
        await this.findUtxos(feePerKb)
        const selected = this.createTransaction(feePerKb)

        return new UtxoFee(
            feePerKb,
            true,
            !!selected,
            confirmationTimeSecs,
            selected ? this.utils.amount(selected?.feeBase, currencySymbol) : null,
        )
    }

    private async findUtxos(feePerKb: CurrencyAmount<CI>): Promise<void> {
        // 1) Check if the provided UTXOs already suffice
        if (this.createTransaction(feePerKb)) {
            return
        }

        // 2) Otherwise, keep fetching until we either have enough or get no more UTXOs
        while (!this.state.crawled) {
            const utxosByAddress = await this.utils.addressUtxos(this.fromAddress, this.state.page)

            // If no new UTXOs are returned, break out of loop
            if (utxosByAddress.utxos.length === 0) {
                this.state.crawled = true
                break
            }

            // Push all new UTXOs into the state's UTXOs array
            for (const utxo of utxosByAddress.utxos) {
                this.state.utxos.push({
                    txid: utxo.txid,
                    amount: utxo.amount.baseAmount,
                    script: utxo.script,
                    n: utxo.n,
                })
            }

            // Check again if we now have enough
            if (this.createTransaction(feePerKb)) break

            // Increment the page so next time we fetch the next "page"
            this.state.page++
        }
    }

    private createTransaction(feePerKb: CurrencyAmount<CI>): CreateTransactionResult | null {
        // IMPROVE: Do not allow dust outputs

        const vins = this.state.utxos.map((utxo) => ({
            txid: hexToBytes(utxo.txid),
            index: utxo.n,
            witnessUtxo: {
                script: utxo.script,
                amount: BigInt(toSatoshi(toDecimal(utxo.amount.toString())).toString()),
            },
        }))

        const vouts = [
            {
                address: this.toLegacyAddress(this.toAddress),
                amount: BigInt(this.amount.minimalUnitAmount.toString()),
            },
        ]

        const selected = btc.selectUTXO(vins, vouts, 'default', {
            changeAddress: this.toLegacyAddress(this.fromAddress),
            feePerByte: BigInt(feePerKb.minimalUnitAmount.div(1000).round().toString()),
            bip69: true,
            createTx: true,
            allowLegacyWitnessUtxo: true,
            network: this.networkParams,
        })

        if (!selected) return null

        return {
            vins: selected.inputs.map((input) => ({
                txid: bytesToHex(input.txid, false),
                amount: toBase(input.witnessUtxo.amount),
                n: input.index,
                script: input.witnessUtxo.script,
            })),
            vouts: selected.outputs.map((output) => {
                if (!('address' in output)) throw new Error()
                return {
                    amount: toBase(output.amount),
                    address: output.address,
                }
            }),
            feeBase: toBase(selected.fee),
        }
    }

    protected abstract toLegacyAddress(address: Address): string
    protected abstract sign(inputs: Txo[], outputs: TxVout[]): Promise<Uint8Array>
}
