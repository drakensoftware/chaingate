import { CurrencyInfo } from '../../../CurrencyInfo'
import { UtxoNetworkKey } from '../../../../Client'
import { UtxoCurrencyUtils } from '../UtxoCurrencyUtils/UtxoCurrencyUtils'
import { PublicKey } from '../../../../Wallet/entities/PublicKey'
import * as btc from '@scure/btc-signer'
import { NetworkParams } from '../UtxoCurrencyUtils/NetworkParams'
import { PrivateKey } from '../../../../Wallet/entities/Secret/implementations/PrivateKey'
import {
    getSignedMessagePublicKey,
    signMessage,
} from '../../../CurrencyWallet/abstract/UtxoWallet/MessageSigner'
import { ChainGateContext } from '../../ChainGateContext'

export type AddressTypeSupported = 'legacy-p2pkh' | 'legacy-p2pk' | 'segwit-p2wpkh' | 'taproot-p2tr'

export type AddressType =
    | 'legacy-p2pkh'
    | 'legacy-p2sh'
    | 'legacy-p2pk'
    | 'legacy-p2ms'
    | 'segwit-p2wpkh'
    | 'segwit-p2wsh'
    | 'taproot-p2tr'
    | 'taproot-n-of-n'
    | 'taproot-m-of-n'
    | 'anchor'

export abstract class Bech32UtxoCurrencyUtils<
    CI extends CurrencyInfo,
> extends UtxoCurrencyUtils<CI> {
    protected constructor(
        context: ChainGateContext,
        currencyInfo: CI,
        network: UtxoNetworkKey,
        networkParams: NetworkParams,
        signHeader: string,
    ) {
        super(context, currencyInfo, network, networkParams, signHeader)
    }

    publicKeyToAddress(
        publicKey: PublicKey,
        addressType: AddressTypeSupported = 'segwit-p2wpkh',
    ): string {
        let publicKeyRaw = publicKey.raw

        switch (addressType) {
            case 'legacy-p2pkh':
                return btc.p2pkh(publicKeyRaw, this.networkParams).address

            case 'legacy-p2pk':
                return btc.p2pkh(publicKeyRaw).address

            case 'segwit-p2wpkh':
                return btc.p2wpkh(publicKeyRaw, this.networkParams).address

            case 'taproot-p2tr':
                if (publicKeyRaw.length === 33) publicKeyRaw = publicKeyRaw.slice(1)
                return btc.p2tr(publicKeyRaw, undefined, this.networkParams).address

            default:
                throw new Error(`Address type "${addressType}" not supported`)
        }
    }

    identifyAddressType(address: string): AddressType | 'unknown' {
        try {
            const addr = btc.Address(this.networkParams).decode(address)
            switch (addr.type) {
                case 'pkh':
                    return 'legacy-p2pkh'
                case 'sh':
                    return 'legacy-p2sh'
                case 'pk':
                    return 'legacy-p2pk'
                case 'ms':
                    return 'legacy-p2ms'
                case 'wpkh':
                    return 'segwit-p2wpkh'
                case 'wsh':
                    return 'segwit-p2wsh'
                case 'tr':
                    return 'taproot-p2tr'
                case 'tr_ns':
                    return 'taproot-n-of-n'
                case 'tr_ms':
                    return 'taproot-m-of-n'
                case 'p2a':
                    return 'anchor'
                default:
                    return 'unknown'
            }
        } catch {
            return 'unknown'
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
        const supportedTypes: AddressTypeSupported[] = [
            'legacy-p2pkh',
            'legacy-p2pk',
            'segwit-p2wpkh',
            'taproot-p2tr',
        ]

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
