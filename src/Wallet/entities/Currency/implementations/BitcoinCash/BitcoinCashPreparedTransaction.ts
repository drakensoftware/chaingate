import {bytesToHex, hexToBytes} from '../../../../../Utils/Utils'
import {ChainGateClient, UtxoApi} from 'chaingate-client'
import bch from 'bitcore-lib-cash'
import {toCashAddress, toLegacyAddress} from 'bchaddrjs'
import {Address} from '../../../Address'
import {TxVout, UtxoPreparedTransaction} from '../../abstract/Utxo/UtxoPreparedTransaction'
import {PrivateKeyProvider} from '../../CurrencyProviders'
import {CurrencyInfo} from '../../CurrencyInfo'
import {CurrencyAmount} from '../../CurrencyAmount'
import {Txo} from '../../abstract/Utxo/Txo'
import {toSatoshi} from '../../abstract/Utxo/UtxoUtils'

Object.defineProperty(global,  '_bitcoreCash', { 	get(){ 		return undefined 	}, 	set(){}, configurable: true })

export class BitcoinCashPreparedTransaction<DefaultUnit extends string> extends UtxoPreparedTransaction<DefaultUnit> {

    constructor(
        api: UtxoApi,
        client: ChainGateClient,
        currencyInfo: CurrencyInfo,
        fromAddress: Address,
        toAddress: Address,
        amount: CurrencyAmount,
        privateKeyProvider: PrivateKeyProvider) {
        super(api, client, currencyInfo, fromAddress, toAddress, amount, {
            bech32: 'bc',
            pubKeyHash: 0x00,
            scriptHash: 0x05,
            wif: 0x80
        }, privateKeyProvider)
    }

    protected toLegacyAddress(address: Address): string {
        return toLegacyAddress(address)
    }

    protected async sign(inputs: Txo[], outputs: TxVout[]): Promise<Uint8Array> {
        let transaction = new bch.Transaction()

        transaction = transaction.from(
            inputs.map(t => new bch.Transaction.UnspentOutput({
                txId: t.txid,
                outputIndex: t.n,
                script: bch.Script.fromHex(bytesToHex(t.script, false)),
                satoshis: toSatoshi(t.amount).toNumber()
            }))
        )

        outputs.forEach(t => {
            transaction = transaction.addOutput(new bch.Transaction.Output({
                satoshis: toSatoshi(t.amount).toNumber(),
                script: bch.Script.fromAddress(bch.Address.fromString(toCashAddress(t.address)))
            }))
        })

        const privateKey = (await this.privateKeyProvider()).raw
        transaction = transaction.sign(bytesToHex(privateKey, false))

        return hexToBytes(transaction.serialize())
    }
}
