import {InitializeWallet} from './InitializeWallet'

export * as castWallet from './CastWallet'
export { ChainGateClient as BlockchainData } from 'chaingate-client'
export const initializeWallet = new InitializeWallet()
