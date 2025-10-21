import { CurrencyUtilsProvider } from './CurrencyUtilsProvider'
import { createChainGateContext } from './InitializeWallet'

export async function initializeUtils({
    apiKey = '',
}: {
    apiKey?: string
} = {}) {
    return new CurrencyUtilsProvider(createChainGateContext(apiKey))
}
