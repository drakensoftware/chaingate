import {PublicKey} from '../PublicKey'
import {CurrencyInfo} from './CurrencyInfo'
import {PrivateKey} from '../Secret/implementations/PrivateKey'

export type PublicKeyProvider = () => Promise<PublicKey>
export type PrivateKeyProvider = () => Promise<PrivateKey>

export type CurrencyProviders = {
    getPublicKeyProvider: (currencyInfo: CurrencyInfo) => Promise<PublicKeyProvider>;
    getPrivateKeyProvider: (currencyInfo: CurrencyInfo) => Promise<PrivateKeyProvider>;
}
