import {Currency} from '../../entities/Currency/Currency'

export interface ICurrencyWithDerivationPaths {
    setDerivationPath(newDerivationPath: string): void;
    getDerivationPath(): string;
}

export function CurrencyWithDerivationPaths<T extends Currency>(
    instance: T,
    currenciesDerivationPaths: Map<string, string>
): T & ICurrencyWithDerivationPaths {
    return Object.assign(instance, {
        setDerivationPath(newDerivationPath: string): void {
            currenciesDerivationPaths.set(instance.currencyInfo.id, newDerivationPath)
        },

        getDerivationPath(): string {
            return (
                currenciesDerivationPaths.get(instance.currencyInfo.id) ??
                instance.currencyInfo.defaultDerivationPath
            )
        }
    })
}