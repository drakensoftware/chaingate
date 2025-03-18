import {ChainGateWallet} from './ChainGateWallet'
import {HDWallet} from './Wallet/abstract/HDWallet/HDWallet'
import {PrivateKeyWallet} from './Wallet/implementations/PrivateKeyWallet/PrivateKeyWallet'
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
    return wallet instanceof PhraseWallet || wallet instanceof SeedWallet || wallet instanceof PrivateKeyWallet
}

export function requireLocalWallet(wallet: ChainGateWallet){
    if(!isLocalWallet(wallet)) throw new InvalidWallet()
}


// HDWallet

export function isDerivationPathsWallet(wallet: ChainGateWallet){
    return wallet instanceof HDWallet
}

export function requireDerivationPathsSupport(wallet: ChainGateWallet){
    if(!isDerivationPathsWallet(wallet)) throw new InvalidWallet()
}


// ImportedPrivateKey

export function isPrivateKeyWallet(wallet: ChainGateWallet){
    return wallet instanceof PrivateKeyWallet
}

export function requirePrivateKeyWallet(wallet: ChainGateWallet){
    if(!isPrivateKeyWallet(wallet)) throw new InvalidWallet()
}


// Seed wallet

export function isSeedWallet(wallet: ChainGateWallet){
    return wallet instanceof SeedWallet
}

export function requireSeedWallet(wallet: ChainGateWallet){
    if(!isSeedWallet(wallet)) throw new InvalidWallet()
}


// Phrase wallet

export function isPhraseWallet(wallet: ChainGateWallet){
    return wallet instanceof PhraseWallet
}

export function requirePhraseWallet(wallet: ChainGateWallet){
    if(!isPhraseWallet(wallet)) throw new InvalidWallet()
}
