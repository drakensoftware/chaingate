import { UtxoCurrencyUtils } from '../abstract/UtxoCurrencyUtils/UtxoCurrencyUtils'
import { ChainGateContext } from '../ChainGateContext'
import { DogecoinInfo } from '../../CurrencyInfo'
import { PublicKey } from '../../../Wallet/entities/PublicKey'
import { PrivateKey } from '../../../Wallet/entities/Secret/implementations/PrivateKey'
import * as btc from '@scure/btc-signer'
import {
    getSignedMessagePublicKey,
    signMessage,
} from '../../CurrencyWallet/abstract/UtxoWallet/MessageSigner'

export class DogecoinUtils extends UtxoCurrencyUtils<typeof DogecoinInfo> {
    constructor(context: ChainGateContext) {
        super(
            context,
            DogecoinInfo,
            'dogecoin',
            {
                bech32: null,
                pubKeyHash: 0x1e,
                scriptHash: 0x16,
                wif: 0x9e,
            },
            '\x19Dogecoin Signed Message:\n',
        )
    }

    publicKeyToAddress(publicKey: PublicKey): string {
        const publicKeyRaw = publicKey.raw
        return btc.p2pkh(publicKeyRaw, this.networkParams).address
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

        try {
            const derivedAddress = this.publicKeyToAddress(publicKey)
            return derivedAddress === address
        } catch {
            return false
        }
    }
}
