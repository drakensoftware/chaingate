import { bytesToHex, hexToBytes } from '../../../../InternalUtils/Utils'
import bch from 'bitcore-lib-cash'
import { toCashAddress, toLegacyAddress } from 'bchaddrjs'
import { Address } from '../../../../Wallet/entities/Address'
import { Txo, TxVout, UtxoTransaction } from '../../abstract/UtxoWallet/UtxoTransaction'
import { PrivateKeyProvider } from '../../Transports'
import { toSatoshi } from '../../abstract/UtxoWallet/UtxoUtils'
import { UtxoCurrencyUtils } from '../../../CurrencyUtils/abstract/UtxoCurrencyUtils/UtxoCurrencyUtils'
import { BitcoinCashInfo } from '../../../CurrencyInfo'
import { CurrencyAmount } from '../../../CurrencyUtils'

Object.defineProperty(global, '_bitcoreCash', {
    get() {
        return undefined
    },
    set() {},
    configurable: true,
})

export class BitcoinCashPreparedTransaction extends UtxoTransaction<typeof BitcoinCashInfo> {
    constructor(
        utils: UtxoCurrencyUtils<typeof BitcoinCashInfo>,
        fromAddress: Address,
        toAddress: Address,
        amount: CurrencyAmount<typeof BitcoinCashInfo>,
        privateKeyProvider: PrivateKeyProvider,
    ) {
        super(
            utils,
            fromAddress,
            toAddress,
            amount,
            {
                bech32: 'bc',
                pubKeyHash: 0x00,
                scriptHash: 0x05,
                wif: 0x80,
            },
            privateKeyProvider,
        )
    }

    protected toLegacyAddress(address: Address): string {
        return toLegacyAddress(address)
    }

    protected async sign(inputs: Txo[], outputs: TxVout[]): Promise<Uint8Array> {
        let transaction = new bch.Transaction()

        transaction = transaction.from(
            inputs.map(
                (t) =>
                    new bch.Transaction.UnspentOutput({
                        txId: t.txid,
                        outputIndex: t.n,
                        script: bch.Script.fromHex(bytesToHex(t.script, false)),
                        satoshis: toSatoshi(t.amount).toNumber(),
                    }),
            ),
        )

        outputs.forEach((t) => {
            transaction = transaction.addOutput(
                new bch.Transaction.Output({
                    satoshis: toSatoshi(t.amount).toNumber(),
                    script: bch.Script.fromAddress(
                        bch.Address.fromString(toCashAddress(t.address)),
                    ),
                }),
            )
        })

        const privateKey = (await this.privateKeyProvider()).raw
        transaction = transaction.sign(bytesToHex(privateKey, false))

        return hexToBytes(transaction.serialize())
    }
}
