import React, { createContext, useContext } from 'react'
import { CurrencyUtilsProvider } from '../CurrencyUtilsProvider'
import { createClientAndMarkets } from '../InitializeWallet'

type UtilsContextType = CurrencyUtilsProvider

const UtilsContextInternal = createContext<UtilsContextType | undefined>(undefined)

export const UtilsContext: React.FC<{
    children: React.ReactNode
    apiKey: string
}> = ({ children, apiKey }) => {
    const { markets, client } = createClientAndMarkets(apiKey)
    const utils = new CurrencyUtilsProvider(client, markets)

    return <UtilsContextInternal.Provider value={utils}>{children}</UtilsContextInternal.Provider>
}

export function useUtils(): { utils: CurrencyUtilsProvider } {
    const ctx = useContext(UtilsContextInternal)
    if (!ctx) {
        throw new Error('useUtils must be used within <UtilsContext>')
    }
    return { utils: ctx }
}
