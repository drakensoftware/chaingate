import {BitcoinCashApi, ChainGateClient} from 'chaingate-client'
import {buildUrlWithApiKey, bytesToHex} from '../../../../../Utils/Utils'
import bch from 'bitcore-lib-cash'
import {toCashAddress, toLegacyAddress} from 'bchaddrjs'
import {Address} from '../../../Address'
import {Utxo} from '../../abstract/Utxo/Utxo'
import {CurrencyProviders} from '../../CurrencyProviders'
import {CurrencyAmount} from '../../CurrencyAmount'
import {BitcoinCashPreparedTransaction} from './BitcoinCashPreparedTransaction'

Object.defineProperty(global,  '_bitcoreCash', { 	get(){ 		return undefined 	}, 	set(){}, configurable: true })

export class BitcoinCash extends Utxo<'bch'> {
    declare currencyProviders: CurrencyProviders

    constructor(client: ChainGateClient, api: BitcoinCashApi,  currencyProviders: CurrencyProviders) {
        super({
            symbol: 'BCH',
            id: 'bitcoin-cash',
            name: 'Bitcoin Cash',
            svgLogoUrl: buildUrlWithApiKey('https://api.chaingate.dev/bitcoincash/logo'),
            decimals: 8,
            defaultDerivationPath: 'm/44\'/145\'/0\'/0/0',
            minimalUnitSymbol: 'satoshi',
            commonDerivationPaths: ['m/44\'/145\'/0\'/0/0']
        },
        client,
        api,
        currencyProviders,
        {
            bech32: 'bc',
            pubKeyHash: 0x00,
            scriptHash: 0x05,
            wif: 0x80
        })
    }

    async getAddress(addressType: 'legacy' | 'cashaddr' | 'bitpay' = 'cashaddr'): Promise<string> {
        const publicKey = await (await this.currencyProviders.getPublicKeyProvider(this.currencyInfo))()

        const publicKeyRaw = publicKey.raw

        const publicKeyBch = new bch.PublicKey(bytesToHex(publicKeyRaw, false))
        const bchAddr = bch.Address.fromPublicKey(publicKeyBch, bch.Networks.mainnet).toCashAddress()

        switch (addressType){
        case 'legacy': return toLegacyAddress(bchAddr)
        case 'cashaddr': return bchAddr
        case 'bitpay': return toCashAddress(bchAddr)
        }
    }

    async createTransfer(toAddress: Address, amount: CurrencyAmount): Promise<BitcoinCashPreparedTransaction<'bch'>> {
        const privateKeyProvider = await this.currencyProviders.getPrivateKeyProvider(this.currencyInfo)

        return new BitcoinCashPreparedTransaction(
            this.api,
            this.client,
            this.currencyInfo,
            await this.getAddress(),
            toAddress,
            amount,
            privateKeyProvider
        )
    }
}
