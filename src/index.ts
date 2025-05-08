import {Wallet} from './Wallet/Wallet'
import {HDWallet} from './Wallet/abstract/HDWallet/HDWallet'
import {PhraseWallet} from './Wallet/implementations/PhraseWallet/PhraseWallet'
import {SeedWallet} from './Wallet/implementations/SeedWallet/SeedWallet'
import {PrivateKeyWallet} from './Wallet/implementations/PrivateKeyWallet/PrivateKeyWallet'
import {FiatCurrencies} from './MarketsProvider'

export {Wallet, HDWallet, PhraseWallet, SeedWallet, PrivateKeyWallet, FiatCurrencies}

export * as initializeWallet from './InitializeWallet'
export * as castWallet from './CastWallet'

export { ChainGateClient as BlockchainData } from 'chaingate-client'
