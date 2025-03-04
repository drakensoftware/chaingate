import {SeedWallet} from './Wallet/implementations/SeedWallet/SeedWallet'
import {PhraseWallet} from './Wallet/implementations/PhraseWallet/PhraseWallet'
import {ImportedPrivateKey} from './Wallet/implementations/ImportedPrivateKey/ImportedPrivateKey'

export type ChainGateWallet = ImportedPrivateKey | SeedWallet | PhraseWallet
