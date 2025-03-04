import {ChainGateWallet} from './ChainGateWallet'
import {LocalWallet} from './Wallet/abstract/LocalWallet/LocalWallet'
import {HDWallet} from './Wallet/abstract/HDWallet/HDWallet'
import {ImportedPrivateKey} from './Wallet/implementations/ImportedPrivateKey/ImportedPrivateKey'
import {SeedWallet} from './Wallet/implementations/SeedWallet/SeedWallet'
import {PhraseWallet} from './Wallet/implementations/PhraseWallet/PhraseWallet'

export class InvalidWallet extends Error {
    constructor() {
        super('Wallet is invalid')
        if (Error.captureStackTrace) Error.captureStackTrace(this, InvalidWallet)
        this.name = this.constructor.name
    }
}


// LocalWallet

export function isLocalWallet(wallet: ChainGateWallet){
    return wallet instanceof LocalWallet
}

export function requireLocalWallet(wallet: ChainGateWallet){
    if(!(wallet instanceof LocalWallet)) throw new InvalidWallet()
}


// HDWallet

export function supportsDerivationPaths(wallet: ChainGateWallet){
    return wallet instanceof HDWallet
}

export function requireDerivationPathsSupport(wallet: ChainGateWallet){
    if(!(wallet instanceof HDWallet)) throw new InvalidWallet()
}


// ImportedPrivateKey

export function isPrivateKeyWallet(wallet: ChainGateWallet){
    return wallet instanceof ImportedPrivateKey
}

export function requirePrivateKeyWallet(wallet: ChainGateWallet){
    if(!(wallet instanceof ImportedPrivateKey)) throw new InvalidWallet()
}


// Seed wallet

export function isSeedWallet(wallet: ChainGateWallet){
    return wallet instanceof SeedWallet
}

export function requireSeedWallet(wallet: ChainGateWallet){
    if(!(wallet instanceof SeedWallet)) throw new InvalidWallet()
}


// Phrase wallet

export function isPhraseWallet(wallet: ChainGateWallet){
    return wallet instanceof PhraseWallet
}

export function requirePhraseWallet(wallet: ChainGateWallet){
    if(!(wallet instanceof PhraseWallet)) throw new InvalidWallet()
}
