import {BitcoinCashApi} from 'chaingate-client'
import {buildUrlWithApiKey, bytesToHex} from '../../../../../Utils/Utils'
import bch from 'bitcore-lib-cash'
import {toCashAddress, toLegacyAddress} from 'bchaddrjs'
import {Address} from '../../../Address'
import {Utxo} from '../../abstract/Utxo/Utxo'
import {HDPrivateKeySign, PrivateKeySign} from '../../CurrencyParams'
import {CurrencyAmount} from '../../CurrencyAmount'
import {
    BitcoinCashPreparedTransaction
} from './BitcoinCashPreparedTransaction'

export class BitcoinCash extends Utxo<'bch'> {
    declare currencyParams: PrivateKeySign | HDPrivateKeySign

    constructor(api: BitcoinCashApi,  currencyParams: PrivateKeySign | HDPrivateKeySign) {
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
        api,
        currencyParams,
        {
            bech32: 'bc',
            pubKeyHash: 0x00,
            scriptHash: 0x05,
            wif: 0x80
        })
    }

    async getAddress(addressType: 'legacy' | 'cashaddr' | 'bitpay' = 'cashaddr'): Promise<string> {
        let publicKey
        if(this.currencyParams.signMode == 'privateKey') publicKey = await this.currencyParams.getPublicKey()
        else publicKey = await this.currencyParams.getPublicKey(this.currencyParams.getDerivationPath(this.currencyInfo))

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

        let privateKeyProvider
        if(this.currencyParams.signMode == 'privateKey') privateKeyProvider = this.currencyParams.getPrivateKey
        else if (this.currencyParams.signMode == 'hdPrivateKey') {
            const derivationPath = this.currencyParams.getDerivationPath(this.currencyInfo)
            privateKeyProvider = this.currencyParams.getPrivateKey.bind(this.currencyParams, derivationPath)
        }

        return new BitcoinCashPreparedTransaction(
            this.api,
            this.currencyParams,
            this.currencyInfo,
            await this.getAddress(),
            toAddress,
            amount,
            privateKeyProvider
        )
    }
}
