import {hexToBytes} from '../../../../../Utils/Utils'
import Decimal from 'decimal.js'
import * as btc from '@scure/btc-signer'
import {UtxoApi} from 'chaingate-client'
import { Address } from '../../../Address'
import {OutScript} from '@scure/btc-signer'
import {PrivateKey} from '../../../Secret/implementations/PrivateKey'
import {CurrencyParams} from '../../CurrencyParams'
import {TxVout, UtxoPreparedTransaction} from '../Utxo/UtxoPreparedTransaction'
import {CurrencyInfo} from '../../CurrencyInfo'
import {CurrencyAmount} from '../../CurrencyAmount'
import {NetworkParams} from '../Utxo/NetworkParams'
import {Txo} from '../Utxo/Txo'
import {toSatoshi} from '../Utxo/UtxoUtils'


export class LegacyUtxoPreparedTransaction<DefaultUnit extends string> extends UtxoPreparedTransaction<DefaultUnit> {
    constructor(
        api: UtxoApi,
        currencyParams: CurrencyParams,
        currencyInfo: CurrencyInfo,
        fromAddress: Address,
        toAddress: Address,
        amount: CurrencyAmount,
        networkParams: NetworkParams,
        privateKeyProvider: () => Promise<PrivateKey>) {
        super(api, currencyParams, currencyInfo, fromAddress, toAddress, amount, networkParams, privateKeyProvider)
    }

    protected toLegacyAddress(address: Address): string {
        return address
    }

    protected async sign(inputs: Txo[], outputs: TxVout[]): Promise<Uint8Array> {

        const txVins = inputs.map(vin => ({
            txid: hexToBytes(vin.txid),
            index: vin.n,
            witnessUtxo: {
                script: vin.script,
                amount: BigInt(toSatoshi(new Decimal(vin.amount.toString())).toString())
            }
        }))

        const txVouts = outputs.map(vout => ({
            script: OutScript.encode(btc.Address(this.networkParams).decode(vout.address)),
            amount: BigInt(toSatoshi(vout.amount).toString())
        }))

        const transaction = new btc.Transaction({
            allowLegacyWitnessUtxo: true
        })

        for (const txVin of txVins) transaction.addInput(txVin)
        for (const txVout of txVouts) transaction.addOutput(txVout)

        const privateKeyRaw = (await this.privateKeyProvider()).raw
        for(let i=0; i<transaction.inputsLength; i++) transaction.signIdx(privateKeyRaw, i)
        transaction.finalize()

        return hexToBytes(transaction.hex)
    }
}
