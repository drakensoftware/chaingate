import React, { createContext, useContext, useState } from 'react'
import * as iw from '../InitializeWallet'
import { PrivateKeyWallet } from '../Wallet'
import { PhraseWallet } from '../Wallet'
import { SeedWallet } from '../Wallet'

type Wallet = PrivateKeyWallet | PhraseWallet | SeedWallet

type WalletContextType = {
    wallet: Wallet | null
    setWallet: (wallet: Wallet) => void
}

const WalletContextInternal = createContext<WalletContextType | undefined>(undefined)

export const WalletContext: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const [wallet, setWallet] = useState<Wallet | null>(null)

    return (
        <WalletContextInternal.Provider value={{ wallet, setWallet }}>
            {children}
        </WalletContextInternal.Provider>
    )
}

export function useWallet() {
    const ctx = useContext(WalletContextInternal)
    if (!ctx) {
        throw new Error('useWallet must be used within <WalletContext>')
    }

    const { wallet, setWallet } = ctx

    const initializeWallet = {
        async create(args: Parameters<typeof iw.create>[0]) {
            const c = await iw.create(args)
            setWallet(c.wallet)
            return c
        },
        async fromPrivateKey(args: Parameters<typeof iw.fromPrivateKey>[0]) {
            const wallet = await iw.fromPrivateKey(args)
            setWallet(wallet)
            return wallet
        },
        async fromSeed(args: Parameters<typeof iw.fromSeed>[0]) {
            const wallet = await iw.fromSeed(args)
            setWallet(wallet)
            return wallet
        },
        async fromPhrase(args: Parameters<typeof iw.fromPhrase>[0]) {
            const wallet = await iw.fromPhrase(args)
            setWallet(wallet)
            return wallet
        },
        async fromKeystore(args: Parameters<typeof iw.fromKeystore>[0]) {
            const wallet = await iw.fromKeystore(args)
            setWallet(wallet)
            return wallet
        },
        async deserialize(args: Parameters<typeof iw.deserialize>[0]) {
            const wallet = await iw.deserialize(args)
            setWallet(wallet)
            return wallet
        },

        checkPhrase: iw.checkPhrase,
        checkSeed: iw.checkSeed,
        checkPrivateKey: iw.checkPrivateKey,
        checkKeystore: iw.checkKeystore,
        checkSerialized: iw.checkSerialized,
    }

    const closeWallet = () => {
        setWallet(null)
    }

    return { wallet, initializeWallet, closeWallet }
}
