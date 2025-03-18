import {SeedWallet} from './Wallet/implementations/SeedWallet/SeedWallet'
import {PhraseWallet} from './Wallet/implementations/PhraseWallet/PhraseWallet'
import {PrivateKeyWallet} from './Wallet/implementations/PrivateKeyWallet/PrivateKeyWallet'

export type ChainGateWallet = PrivateKeyWallet | SeedWallet | PhraseWallet
