import { CurrencyUtils } from '../../CurrencyUtils'
import { CurrencyInfo } from '../../../CurrencyInfo'
import {
    utxoAddressBalance,
    utxoAddressHistory,
    utxoBlockByHash,
    utxoBlockByHeight,
    utxoBroadcastTransaction,
    utxoFeeRate,
    utxoLatestBlock,
    utxoMempool,
    UtxoNetworkKey,
    utxoTransactionDetails,
    utxoUtxosByAddress,
} from '../../../../Client'
import { CurrencyAmount } from '../../CurrencyAmount'
import { bytesToHex, hexToBytes } from '../../../../InternalUtils/Utils'
import { toDecimal } from '../../../../InternalUtils/NumberLike'
import { NetworkParams } from './NetworkParams'
import { ChainGateContext } from '../../ChainGateContext'
import Decimal from 'decimal.js'
import * as btc from '@scure/btc-signer'

type TxoCache = {
    txid: string
    n: number
    amount: Decimal
    script: Uint8Array
    address: string
}

export abstract class UtxoCurrencyUtils<CI extends CurrencyInfo> extends CurrencyUtils<CI> {
    protected readonly network: UtxoNetworkKey
    protected readonly networkParams: NetworkParams
    protected readonly signHeader: string
    protected readonly addressToNative: (arg: string) => string | null

    protected constructor(
        context: ChainGateContext,
        currencyInfo: CI,
        network: UtxoNetworkKey,
        networkParams: NetworkParams,
        signHeader: string,
        addressToNative?: (arg: string) => string,
    ) {
        super(context, currencyInfo)
        this.network = network
        this.networkParams = networkParams
        this.signHeader = signHeader
        this.addressToNative = addressToNative
    }

    public async addressUtxos(address: string, page = 0) {
        const response = await utxoUtxosByAddress({
            client: this.context.client,
            path: { network: this.network },
            query: { address, page },
        })

        return {
            page: response.data.page,
            utxos: response.data.utxos.map((utxo) => ({
                txid: utxo.txid,
                script: hexToBytes(utxo.script),
                amount: this.buildAmount(utxo.amount),
                n: utxo.n,
            })),
        }
    }

    public async addressBalance(
        address: string,
    ): Promise<{ confirmed: CurrencyAmount<CI>; unconfirmed: CurrencyAmount<CI> }> {
        const result = await utxoAddressBalance({
            client: this.context.client,
            path: { network: this.network },
            query: { address },
        })

        return {
            confirmed: this.buildAmount(result.data.confirmed),
            unconfirmed: this.buildAmount(result.data.unconfirmed),
        }
    }

    async addressHistory(address: string, page = 0) {
        const respose = await utxoAddressHistory({
            client: this.context.client,
            path: { network: this.network },
            query: { address, page },
        })

        return {
            transactions: respose.data.transactions.map((t) => ({
                amount: this.buildAmount(t.amount),
                addressBalance: this.buildAmount(t.addressBalance),
                txid: t.txid,
                height: t.height,
            })),
            page: respose.data.page,
        }
    }

    async broadcastTransaction(transactionRaw: string | Uint8Array) {
        const result = await utxoBroadcastTransaction({
            client: this.context.client,
            path: { network: this.network },
            body: {
                transactionRaw:
                    transactionRaw instanceof Uint8Array
                        ? bytesToHex(transactionRaw, false)
                        : transactionRaw,
            },
        })
        return { transactionId: result.data.txId }
    }

    async transactionDetails(transactionId: string) {
        const result = await utxoTransactionDetails({
            client: this.context.client,
            path: { network: this.network },
            query: { transactionId },
        })
        return {
            blockHeight: result.data.blockHeight ?? null,
            fee: this.buildAmount(result.data.fee),
            feePerKb: this.buildAmount(result.data.feePerKb),
            timestamp: result.data.timestamp,
            inputs: result.data.inputs.map((input) => ({
                address: input.address,
                amount: this.buildAmount(input.amount),
                n: toDecimal(input.n),
                script: input.script ? hexToBytes(input.script) : null,
                scriptSig: input.scriptSig ? hexToBytes(input.scriptSig) : null,
            })),
            outputs: result.data.outputs.map((output) => ({
                address: output.address,
                amount: this.buildAmount(output.amount),
                n: toDecimal(output.n),
                script: output.script ? hexToBytes(output.script) : null,
            })),
            rawTransaction: result.data.rawTransaction,
        }
    }

    async getFeeRate() {
        const result = await utxoFeeRate({
            client: this.context.client,
            path: { network: this.network },
        })

        return {
            low: {
                feePerKb: this.buildAmount(result.data.low.feePerKb),
                confirmationTimeSecs: Number(result.data.low.confirmationTimeSecs),
            },
            normal: {
                feePerKb: this.buildAmount(result.data.normal.feePerKb),
                confirmationTimeSecs: Number(result.data.normal.confirmationTimeSecs),
            },
            high: {
                feePerKb: this.buildAmount(result.data.high.feePerKb),
                confirmationTimeSecs: Number(result.data.high.confirmationTimeSecs),
            },
            maximum: {
                feePerKb: this.buildAmount(result.data.maximum.feePerKb),
                confirmationTimeSecs: Number(result.data.maximum.confirmationTimeSecs),
            },
        }
    }

    async latestBlock() {
        const result = await utxoLatestBlock({
            client: this.context.client,
            path: { network: this.network },
        })
        return result.data
    }

    async mempoolTransactions() {
        const result = await utxoMempool({
            client: this.context.client,
            path: { network: this.network },
        })
        return result.data
    }

    async blockByHeight(blockHeight: number) {
        const result = await utxoBlockByHeight({
            client: this.context.client,
            path: { network: this.network },
            query: { blockHeight },
        })
        return result.data
    }

    async blockByHash(blockHash: string) {
        const result = await utxoBlockByHash({
            client: this.context.client,
            path: { network: this.network },
            query: { blockHash },
        })
        return result.data
    }

    getUtxoCache(): Array<TxoCache> {
        const key = `${this.currencyInfo.id}/utxoCache`
        let utxoCache = this.context.extra.get(key) as Array<TxoCache> | undefined

        if (!utxoCache) {
            utxoCache = []
            this.context.extra.set(key, utxoCache)
        }

        return utxoCache
    }

    getSpentTxoCache(): Array<TxoCache> {
        const key = `${this.currencyInfo.id}/spentTxoCache`
        let spentTxoCache = this.context.extra.get(key) as Array<TxoCache> | undefined

        if (!spentTxoCache) {
            spentTxoCache = []
            this.context.extra.set(key, spentTxoCache)
        }

        return spentTxoCache
    }

    addressToScript(address: string): Uint8Array {
        if (this.addressToNative) address = this.addressToNative(address)
        const desc = btc.Address(this.networkParams).decode(address)
        return new Uint8Array(btc.OutScript.encode(desc))
    }

    scriptToAddress(script: Uint8Array): string {
        const out = btc.OutScript.decode(script)
        return btc.Address(this.networkParams).encode(out)
    }
}
