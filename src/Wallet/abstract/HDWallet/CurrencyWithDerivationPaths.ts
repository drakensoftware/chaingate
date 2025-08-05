import { CurrencyWallet } from '../../../Currencies/CurrencyWallet/CurrencyWallet'
import { CurrencyInfo } from '../../../Currencies'

export interface ICurrencyWithDerivationPaths {
    setDerivationPath(newDerivationPath: string): void
    getDerivationPath(): string
}

export function CurrencyWithDerivationPaths<CI extends CurrencyInfo, T extends CurrencyWallet<CI>>(
    instance: T,
    currenciesDerivationPaths: Map<string, string>,
): T & ICurrencyWithDerivationPaths {
    return Object.assign(instance, {
        setDerivationPath(newDerivationPath: string): void {
            currenciesDerivationPaths.set(instance.utils.currencyInfo.id, newDerivationPath)
        },

        getDerivationPath(): string {
            return (
                currenciesDerivationPaths.get(instance.utils.currencyInfo.id) ??
                instance.utils.currencyInfo.defaultDerivationPath
            )
        },
    })
}
