import { bytesToHex } from '../../../../InternalUtils/Utils'
import bch from 'bitcore-lib-cash'
import { toCashAddress, toLegacyAddress } from 'bchaddrjs'
import { Address } from '../../../../Wallet/entities/Address'
import { UtxoWallet } from '../../abstract/UtxoWallet/UtxoWallet'
import { Transports } from '../../Transports'
import { BitcoinCashPreparedTransaction } from './BitcoinCashPreparedTransaction'
import { BitcoinCashInfo } from '../../../CurrencyInfo'
import { UtxoCurrencyUtils } from '../../../CurrencyUtils/abstract/UtxoCurrencyUtils/UtxoCurrencyUtils'
import { BitcoinCashUtils, CurrencyAmount } from '../../../CurrencyUtils'

Object.defineProperty(global, '_bitcoreCash', {
    get() {
        return undefined
    },
    set() {},
    configurable: true,
})

export class BitcoinCashWallet extends UtxoWallet<typeof BitcoinCashInfo> {
    declare utils: BitcoinCashUtils
    declare transports: Transports

    constructor(utils: UtxoCurrencyUtils<typeof BitcoinCashInfo>, transports: Transports) {
        super(utils, transports, {
            bech32: 'bc',
            pubKeyHash: 0x00,
            scriptHash: 0x05,
            wif: 0x80,
        })
    }

    async getAddress(addressType: 'legacy' | 'cashaddr' | 'bitpay' = 'cashaddr'): Promise<string> {
        return this.utils.publicKeyToAddress(await this.getPublicKey(), addressType)
    }

    async createTransfer(
        toAddress: Address,
        amount: CurrencyAmount<typeof BitcoinCashInfo>,
    ): Promise<BitcoinCashPreparedTransaction> {
        const privateKeyProvider = await this.transports.getPrivateKeyProvider(
            this.utils.currencyInfo.id,
        )

        return new BitcoinCashPreparedTransaction(
            this.utils,
            await this.getAddress(),
            toAddress,
            amount,
            privateKeyProvider,
        )
    }
}
