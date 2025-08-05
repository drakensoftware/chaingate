import { CurrencyUtils } from '../CurrencyUtils'
import { Client } from '@hey-api/client-fetch'
import { EvmCurrencyInfo } from '../../CurrencyInfo'
import {
    evmAddressBalance,
    evmAddressTransactionCount,
    evmBlockByHash,
    evmBlockByHeight,
    evmBroadcastTransaction,
    evmCallSmartContractFunction,
    evmEstimateGas,
    evmFeeRate,
    evmLatestBlock,
    EvmNetworkKey,
    evmNetworkStatus,
    evmTransactionDetails,
    GlobalMarketsResponse,
} from '../../../Client'
import { TtlCache } from '../../../InternalUtils/TtlCache'
import { CurrencyAmount } from '../CurrencyAmount'
import { Address } from '../../../Wallet/entities/Address'

import { bytesToHex } from '../../../InternalUtils/Utils'
import { NumberLike, toDecimal } from '../../../InternalUtils/NumberLike'
import { PublicKey } from '../../../Wallet/entities/PublicKey'
import { ethers, SigningKey, verifyMessage } from 'ethers'
import { PrivateKey } from '../../../Wallet/entities/Secret/implementations/PrivateKey'

export class EvmCurrencyUtils<CI extends EvmCurrencyInfo> extends CurrencyUtils<CI> {
    declare currencyInfo: CI
    protected readonly network: EvmNetworkKey

    constructor(
        client: Client,
        currencyInfo: CI,
        markets: TtlCache<GlobalMarketsResponse>,
        network: EvmNetworkKey,
    ) {
        super(client, currencyInfo, markets)
        this.network = network
    }

    public async addressBalance(
        address: string,
    ): Promise<{ confirmed: CurrencyAmount<CI>; unconfirmed: CurrencyAmount<CI> }> {
        const result = await evmAddressBalance({
            client: this.client,
            path: { network: this.network },
            query: { address },
        })

        return {
            confirmed: this.buildAmount(result.data.confirmed),
            unconfirmed: this.buildAmount(result.data.unconfirmed),
        }
    }

    async addressTransactionCount(address: string) {
        const result = await evmAddressTransactionCount({
            client: this.client,
            path: { network: this.network },
            query: { address },
        })
        return Number(result.data)
    }

    async callSmartContractRaw(smartContractAddress: Address, data: string) {
        const result = await evmCallSmartContractFunction({
            client: this.client,
            path: { network: this.network },
            body: { contract: smartContractAddress, data },
        })
        return result.data.result
    }

    async estimateGas(
        addressFrom: string,
        addressTo: string,
        amount: CurrencyAmount<CI>,
        nonce: NumberLike,
        data: string,
    ) {
        const result = await evmEstimateGas({
            client: this.client,
            path: { network: this.network },
            query: {
                addressFrom,
                addressTo,
                amount: amount.baseAmount.toString(),
                nonce: toDecimal(nonce).toString(),
                data: data.toString(),
            },
        })
        return Number(result.data)
    }

    async broadcastTransaction(transactionRaw: string | Uint8Array) {
        const result = await evmBroadcastTransaction({
            client: this.client,
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
        const result = await evmTransactionDetails({
            client: this.client,
            path: { network: this.network },
            query: { transactionId },
        })
        return {
            amount: this.buildAmount(result.data.amount),
            blockHeight: result.data.blockHeight ?? null,
            addressFrom: result.data.from,
            addressTo: result.data.to,
            gas: toDecimal(result.data.gas),
            gasPrice: this.buildAmount(result.data.gasPrice),
            maxFeePerGas: this.buildAmount(result.data.maxFeePerGas),
            maxPriorityFeePerGas: this.buildAmount(result.data.maxPriorityFeePerGas),
            transfers: result.data.transfers.map((transfer) => ({
                amount: this.buildAmount(transfer.amount),
                addressFrom: transfer.from,
                addressTo: transfer.to,
            })),
        }
    }

    async getFeeRate() {
        const result = await evmFeeRate({
            client: this.client,
            path: { network: this.network },
        })
        return result.data
    }

    async networkStatus() {
        const result = await evmNetworkStatus({
            client: this.client,
            path: { network: this.network },
        })
        return result.data
    }

    publicKeyToAddress(publicKey: PublicKey) {
        return ethers.computeAddress(bytesToHex(publicKey.raw, true))
    }

    async signMessage(message: string | Uint8Array, privateKey: PrivateKey): Promise<string> {
        const signer = new ethers.Wallet(new SigningKey(privateKey.raw))
        return await signer.signMessage(message)
    }

    async verifySignedMessage(
        message: string,
        signature: string,
        address: string,
    ): Promise<boolean> {
        try {
            const recoveredAddress = verifyMessage(message, signature)
            return recoveredAddress == address
        } catch (_ex) {
            return false
        }
    }

    async latestBlock() {
        const result = await evmLatestBlock({
            client: this.client,
            path: { network: this.network },
        })
        return result.data
    }

    async blockByHeight(blockHeight: number) {
        const result = await evmBlockByHeight({
            client: this.client,
            path: { network: this.network },
            query: { blockHeight },
        })
        return result.data
    }

    async blockByHash(blockHash: string) {
        const result = await evmBlockByHash({
            client: this.client,
            path: { network: this.network },
            query: { blockHash },
        })
        return result.data
    }
}
