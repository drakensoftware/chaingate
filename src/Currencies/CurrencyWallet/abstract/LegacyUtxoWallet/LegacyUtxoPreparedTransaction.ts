import { hexToBytes } from '../../../../InternalUtils/Utils'

import * as btc from '@scure/btc-signer'
import { OutScript } from '@scure/btc-signer'
import { Address } from '../../../../Wallet/entities/Address'
import { PrivateKeyProvider } from '../../Transports'
import { Txo, TxVout, UtxoTransaction } from '../UtxoWallet/UtxoTransaction'
import { NetworkParams } from '../UtxoWallet/NetworkParams'
import { toSatoshi } from '../UtxoWallet/UtxoUtils'
import { CurrencyInfo } from '../../../CurrencyInfo'
import { CurrencyAmount } from '../../../CurrencyUtils'
import { UtxoCurrencyUtils } from '../../../CurrencyUtils/abstract/UtxoCurrencyUtils/UtxoCurrencyUtils'

export class LegacyUtxoPreparedTransaction<CI extends CurrencyInfo> extends UtxoTransaction<CI> {
    constructor(
        utils: UtxoCurrencyUtils<CI>,
        fromAddress: Address,
        toAddress: Address,
        amount: CurrencyAmount<CI>,
        networkParams: NetworkParams,
        privateKeyProvider: PrivateKeyProvider,
    ) {
        super(utils, fromAddress, toAddress, amount, networkParams, privateKeyProvider)
    }

    protected toLegacyAddress(address: Address): string {
        return address
    }

    protected async sign(inputs: Txo[], outputs: TxVout[]): Promise<Uint8Array> {
        const txVins = inputs.map((vin) => ({
            txid: hexToBytes(vin.txid),
            index: vin.n,
            witnessUtxo: {
                script: vin.script,
                amount: BigInt(toSatoshi(vin.amount.toString()).toString()),
            },
        }))

        const txVouts = outputs.map((vout) => ({
            script: OutScript.encode(btc.Address(this.networkParams).decode(vout.address)),
            amount: BigInt(toSatoshi(vout.amount).toString()),
        }))

        const transaction = new btc.Transaction({
            allowLegacyWitnessUtxo: true,
        })

        for (const txVin of txVins) transaction.addInput(txVin)
        for (const txVout of txVouts) transaction.addOutput(txVout)

        const privateKeyRaw = (await this.privateKeyProvider()).raw
        for (let i = 0; i < transaction.inputsLength; i++) transaction.signIdx(privateKeyRaw, i)
        transaction.finalize()

        return hexToBytes(transaction.hex)
    }
}
