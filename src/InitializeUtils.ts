import { CurrencyUtilsProvider } from './CurrencyUtilsProvider'
import { createClientAndMarkets } from './InitializeWallet'

export async function initalizeUtils({
    apiKey = '',
}: {
    apiKey?: string
} = {}) {
    const { client, markets } = createClientAndMarkets(apiKey)
    return new CurrencyUtilsProvider(client, markets)
}
