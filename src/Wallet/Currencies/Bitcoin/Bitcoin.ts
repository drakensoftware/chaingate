import Decimal from 'decimal.js'
import {Currency, NotEnoughFundsError, PossibleFees} from '../Currency'
import {ChainGateClient} from 'chaingate-client'
import {PrivateKeySource} from '../../Keys'
import {AddressType} from './BitcoinUtils'
import {Address as TapScriptAddress, Tap} from '@cmdcode/tapscript'
import {ConsumeFunction} from '../../../CGDriver'
import BitcoinCurrencyAmount from './BitcoinCurrencyAmount'
import {PreparedBitcoinTransfer} from './PreparedBitcoinTransfer'
import {Utxos} from 'chaingate-client/dist/api'
import {BitcoinFee} from './BitcoinFee'
import * as Utils from '../../../Utils/Utils'

export type UTXO = {
    amount: Decimal, txid: string, n: number, script: Uint8Array
}

export class Bitcoin extends Currency {
    constructor(chainGateClient: ChainGateClient, privateKeySource: PrivateKeySource) {
        super({
            symbol: 'BTC',
            id: 'bitcoin',
            defaultDerivationPath: 'm/84\'/0\'/0\'/0/0',
            name: 'bitcoin',
            svgLogoUrl: Utils.buildUrlWithApiKey('https://api.chaingate.dev/bitcoin/logo')
        }
        ,
        chainGateClient,
        privateKeySource)
    }

    getAddress() {
        return this.getAddressOfType(AddressType.WitnessPubKeyHash)
    }

    async getAddressOfType(typeOfAddress: AddressType) {
        switch (typeOfAddress) {
        case AddressType.PubKeyHash:
            return TapScriptAddress.p2pkh.fromPubKey(this.publicKey.compressed)
        case AddressType.WitnessPubKeyHash:
            return TapScriptAddress.p2wpkh.fromPubKey(this.publicKey.compressed)
        case AddressType.TapRoot:
            return TapScriptAddress.p2tr.fromPubKey(Tap.getPubKey(this.publicKey.compressed)[0])
        case AddressType.ScriptHash:
        case AddressType.WitnessScriptHash:
            throw new Error('Generating script addresses is currently unsupported')
        }
    }

    async getBalance(address?: string) {
        if (!address) address = await this.getAddress()
        const balance = await ConsumeFunction(
            this.chaingateClient.Bitcoin,
            this.chaingateClient.Bitcoin.addressBalance,
            address)
        return {
            confirmed: new BitcoinCurrencyAmount(new Decimal(balance.confirmed)),
            unconfirmed: new BitcoinCurrencyAmount(new Decimal(balance.unconfirmed))
        }
    }

    async prepareTransfer(toAddress: string, amount: BitcoinCurrencyAmount): Promise<PreparedBitcoinTransfer> {
        if (toAddress.startsWith('bcrt1q')) throw new Error('Taproot addresses are not yet supported')

        const fromAddress = await this.getAddress()
        const utxos = await this.buildUtxos(amount.btc)
        const possibleFees = await this.buildPossibleFees()

        return new PreparedBitcoinTransfer(this.chaingateClient, this, fromAddress, toAddress, amount, utxos, possibleFees)
    }

    private async buildUtxos(amountBtc: Decimal) {
        const pickedUtxos = []
        let totalUtxosAmount = new Decimal(0)

        let page = 0
        let utxosByAddress: Utxos
        do {
            utxosByAddress = await ConsumeFunction(
                this.chaingateClient.Bitcoin,
                this.chaingateClient.Bitcoin.utxosByAddress,
                await this.getAddress(), page)

            for (const utxo of utxosByAddress.utxos) {
                pickedUtxos.push({
                    txid: utxo.hash, amount: new Decimal(utxo.amount), n: utxo.n,
                    script: Utils.hexToBytes(utxo.script)
                })
                totalUtxosAmount = totalUtxosAmount.add(new Decimal(utxo.amount))

                if (totalUtxosAmount.gte(amountBtc)) break
            }

            page++
        } while (totalUtxosAmount.lt(amountBtc) && utxosByAddress.page != utxosByAddress.lastPage)

        if (totalUtxosAmount.lt(amountBtc)) throw new NotEnoughFundsError(this, new BitcoinCurrencyAmount(amountBtc.minus(totalUtxosAmount)))

        return pickedUtxos
    }

    private async buildPossibleFees(): Promise<PossibleFees<BitcoinFee>> {
        const feeRateResponse = await ConsumeFunction(
            this.chaingateClient.Bitcoin,
            this.chaingateClient.Bitcoin.feeRate)

        return {
            low: BitcoinFee.feePerByte(new BitcoinCurrencyAmount(new Decimal(feeRateResponse['low'].feePerByte))),
            normal: BitcoinFee.feePerByte(new BitcoinCurrencyAmount(new Decimal(feeRateResponse['normal'].feePerByte))),
            high: BitcoinFee.feePerByte(new BitcoinCurrencyAmount(new Decimal(feeRateResponse['high'].feePerByte))),
            maximum: BitcoinFee.feePerByte(new BitcoinCurrencyAmount(new Decimal(feeRateResponse['maximum'].feePerByte))),
        }
    }
}
