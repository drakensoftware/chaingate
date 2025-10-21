import React, { useContext } from 'react'
import { CurrencyUtilsProvider } from '../CurrencyUtilsProvider'
import { createChainGateContext } from '../InitializeWallet'
import { createContext as createReactContext } from 'react'

type UtilsContextType = CurrencyUtilsProvider

const UtilsContextInternal = createReactContext<UtilsContextType | undefined>(undefined)

export const UtilsContext: React.FC<{
    children: React.ReactNode
    apiKey: string
}> = ({ children, apiKey }) => {
    const context = createChainGateContext(apiKey)
    const utils = new CurrencyUtilsProvider(context)

    return <UtilsContextInternal.Provider value={utils}>{children}</UtilsContextInternal.Provider>
}

export function useUtils(): { utils: CurrencyUtilsProvider } {
    const ctx = useContext(UtilsContextInternal)
    if (!ctx) {
        throw new Error('useUtils must be used within <UtilsContext>')
    }
    return { utils: ctx }
}
