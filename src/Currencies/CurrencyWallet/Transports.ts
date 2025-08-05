import { PublicKey } from '../../Wallet/entities/PublicKey'
import { PrivateKey } from '../../Wallet/entities/Secret/implementations/PrivateKey'

export type PublicKeyProvider = () => Promise<PublicKey>
export type PrivateKeyProvider = () => Promise<PrivateKey>

export type Transports = {
    getPublicKeyProvider: (currencyId: string) => Promise<PublicKeyProvider>
    getPrivateKeyProvider: (currencyId: string) => Promise<PrivateKeyProvider>
}
