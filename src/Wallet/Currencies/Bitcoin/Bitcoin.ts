import Decimal from 'decimal.js'
import {Currency, CurrencyAmount, NotEnoughFundsError, PossibleFees} from '../Currency'
import {PrivateKeySource} from '../../Keys'
import {AddressType} from './BitcoinUtils'
import {Address as TapScriptAddress, Tap} from '@cmdcode/tapscript'
import {ConsumeFunction} from '../../../CGDriver'
import {PreparedBitcoinTransfer} from './PreparedBitcoinTransfer'
import {BitcoinApi, BitcoinTestnetApi} from 'chaingate-client'
import {BitcoinFee} from './BitcoinFee'
import * as Utils from '../../../Utils/Utils'

export type UTXO = {
    amount: Decimal, txid: string, n: number, script: Uint8Array
}


abstract class BitcoinBase extends Currency {
    declare readonly api: BitcoinApi | BitcoinTestnetApi
    private readonly isMainnet: boolean

    protected constructor(api: BitcoinApi | BitcoinTestnetApi, privateKeySource: PrivateKeySource, isMainnet: boolean) {
        super({
            symbol: isMainnet ? 'BTC': 'BTC-TESTNET',
            id: isMainnet ? 'bitcoin' : 'bitcoin-testnet',
            defaultDerivationPath: isMainnet ? 'm/84\'/0\'/0\'/0/0' : 'm/84\'/1\'/0\'/0/0',
            name: 'Bitcoin',
            svgLogoUrl: Utils.buildUrlWithApiKey('https://api.chaingate.dev/bitcoin/logo'),
            decimals: 8,
            minimalUnitSymbol: 'satoshi'
        }
        ,
        api,
        privateKeySource)
        this.isMainnet = isMainnet
    }

    getAddress() {
        return this.getAddressOfType(AddressType.WitnessPubKeyHash)
    }

    async getAddressOfType(typeOfAddress: AddressType) {
        switch (typeOfAddress) {
        case AddressType.PubKeyHash:
            return TapScriptAddress.p2pkh.fromPubKey(this.publicKey.compressed, this.isMainnet ? 'main' : 'testnet')
        case AddressType.WitnessPubKeyHash:
            return TapScriptAddress.p2wpkh.fromPubKey(this.publicKey.compressed, this.isMainnet ? 'main' : 'testnet')
        case AddressType.TapRoot:
            return TapScriptAddress.p2tr.fromPubKey(Tap.getPubKey(this.publicKey.compressed)[0], this.isMainnet ? 'main' : 'testnet')
        case AddressType.ScriptHash:
        case AddressType.WitnessScriptHash:
            throw new Error('Generating script addresses is currently unsupported')
        }
    }

    async getBalance(address?: string): Promise<{confirmed: CurrencyAmount, unconfirmed: CurrencyAmount}>{
        const balance = await ConsumeFunction(
            this.api,
            this.api.addressBalance,
            address ?? await this.getAddress())

        return {
            confirmed: new CurrencyAmount(this, new Decimal(balance.confirmed)),
            unconfirmed: new CurrencyAmount(this, new Decimal(balance.unconfirmed))
        }
    }

    async prepareTransfer(toAddress: string, amount: CurrencyAmount): Promise<PreparedBitcoinTransfer> {
        if (toAddress.startsWith('bc1p') || toAddress.startsWith('tb1p')) throw new Error('Taproot addresses are not yet supported')

        const fromAddress = await this.getAddress()
        const utxos = await this.buildUtxos(amount.baseAmount)
        const possibleFees = await this.buildPossibleFees()

        return new PreparedBitcoinTransfer(this.api, this, fromAddress, toAddress, amount, utxos, possibleFees)
    }

    private async buildUtxos(amountBtc: Decimal) {
        const pickedUtxos = []
        let totalUtxosAmount = new Decimal(0)

        let page = 0
        let utxosByAddress
        do {
            utxosByAddress = await ConsumeFunction(
                this.api,
                this.api.utxosByAddress,
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

        if (totalUtxosAmount.lt(amountBtc)) throw new NotEnoughFundsError(this, new CurrencyAmount(this, amountBtc.minus(totalUtxosAmount)))

        return pickedUtxos
    }

    private async buildPossibleFees(): Promise<PossibleFees<BitcoinFee>> {
        const feeRateResponse = await ConsumeFunction(
            this.api,
            this.api.feeRate)

        return {
            low: BitcoinFee.feePerByte(new CurrencyAmount(this, new Decimal(feeRateResponse['low'].feePerByte))),
            normal: BitcoinFee.feePerByte(new CurrencyAmount(this, new Decimal(feeRateResponse['normal'].feePerByte))),
            high: BitcoinFee.feePerByte(new CurrencyAmount(this, new Decimal(feeRateResponse['high'].feePerByte))),
            maximum: BitcoinFee.feePerByte(new CurrencyAmount(this, new Decimal(feeRateResponse['maximum'].feePerByte))),
        }
    }

    fee(fee: { feePerByte: CurrencyAmount } | { feeAmount: CurrencyAmount }): BitcoinFee {
        if('feePerByte' in fee) return BitcoinFee.feeAmount(fee.feePerByte)
        if('feeAmount' in fee) return BitcoinFee.feeAmount(fee.feeAmount)
    }
}

export class Bitcoin extends BitcoinBase {
    constructor(api: BitcoinApi, privateKeySource: PrivateKeySource) {
        super(api, privateKeySource, true)
    }
}

export class BitcoinTestnet extends BitcoinBase {
    constructor(api: BitcoinApi, privateKeySource: PrivateKeySource) {
        super(api, privateKeySource, false)
    }
}
