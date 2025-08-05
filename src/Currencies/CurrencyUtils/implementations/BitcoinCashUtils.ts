import { UtxoCurrencyUtils } from '../abstract/UtxoCurrencyUtils/UtxoCurrencyUtils'
import { Client } from '@hey-api/client-fetch'
import { TtlCache } from '../../../InternalUtils/TtlCache'
import { GlobalMarketsResponse } from '../../../Client'
import { BitcoinCashInfo } from '../../CurrencyInfo'
import { PrivateKey } from '../../../Wallet/entities/Secret/implementations/PrivateKey'
import { PublicKey } from '../../../Wallet/entities/PublicKey'
import bch from 'bitcore-lib-cash'
import { bytesToHex } from '../../../InternalUtils/Utils'
import { toCashAddress, toLegacyAddress } from 'bchaddrjs'
import {
    getSignedMessagePublicKey,
    signMessage,
} from '../../CurrencyWallet/abstract/UtxoWallet/MessageSigner'
import { sha256 } from '@noble/hashes/sha256'
import { createBase58check } from '@scure/base'

export type AddressTypeSupported = 'legacy' | 'cashaddr' | 'bitpay'

export class BitcoinCashUtils extends UtxoCurrencyUtils<typeof BitcoinCashInfo> {
    constructor(client: Client, markets: TtlCache<GlobalMarketsResponse>) {
        super(
            client,
            BitcoinCashInfo,
            markets,
            'bitcoincash',
            {
                bech32: 'bitcoincash' as string | null, // HRP usado en direcciones CashAddr
                pubKeyHash: 0x00,
                scriptHash: 0x05,
                wif: 0x80,
            },
            '\x18Bitcoin Signed Message:\n',
        )
    }

    identifyAddressType(address: string): 'legacy' | 'cashaddr' | 'bitpay' | 'unknown' {
        const base58check = createBase58check(sha256)

        // Detect CashAddr format
        if (/^(bitcoincash:|bchtest:)?([qp])[0-9a-z]{41}$/i.test(address)) {
            return 'cashaddr'
        }

        // Try to decode as base58check
        try {
            const [version] = base58check.decode(address)
            if ([0, 5].includes(version)) return 'legacy'
            if ([28, 40].includes(version)) return 'bitpay'
        } catch {
            return 'unknown'
        }

        return 'unknown'
    }
    publicKeyToAddress(
        publicKey: PublicKey,
        addressType: AddressTypeSupported = 'cashaddr',
    ): string {
        const publicKeyBch = new bch.PublicKey(bytesToHex(publicKey.raw, false))
        const bchAddr = bch.Address.fromPublicKey(
            publicKeyBch,
            bch.Networks.mainnet,
        ).toCashAddress()

        switch (addressType) {
            case 'legacy':
                return toLegacyAddress(bchAddr)
            case 'cashaddr':
                return bchAddr
            case 'bitpay':
                return toCashAddress(bchAddr)
        }
    }

    signMessage(message: string | Uint8Array, privateKey: PrivateKey): Promise<string> {
        return signMessage(message, privateKey, this.signHeader)
    }

    async verifySignedMessage(
        message: string,
        signature: string,
        address: string,
    ): Promise<boolean> {
        const publicKeyRaw = await getSignedMessagePublicKey(message, signature, this.signHeader)
        const publicKey = new PublicKey(publicKeyRaw)

        const addressType = this.identifyAddressType(address)
        const supportedTypes: AddressTypeSupported[] = ['legacy', 'cashaddr', 'bitpay']

        if (!supportedTypes.includes(addressType as AddressTypeSupported)) return false

        try {
            const derivedAddress = this.publicKeyToAddress(
                publicKey,
                addressType as AddressTypeSupported,
            )
            return derivedAddress === address
        } catch {
            return false
        }
    }
}
