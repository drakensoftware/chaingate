import {Currency} from '../../entities/Currency/Currency'
import {ExtendedPrivateKey} from '../../entities/Secret/implementations/ExtendedPrivateKey'
import {ExtendedPublicKey} from '../../entities/Secret/ExtendedPublicKey'

export interface ICurrencyWithDerivationPaths {
    setDerivationPath(newDerivationPath: string): void;
    getDerivationPath(): string;
}

export function CurrencyWithDerivationPaths<T extends Currency>(
    instance: T,
    currenciesDerivationPaths: Map<string, string>,
    getPrivateKey: (derivationPath: string) => Promise<ExtendedPrivateKey>,
    getPublicKey: (derivationPath: string) => Promise<ExtendedPublicKey>,
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
        },
        getPrivateKey(): Promise<ExtendedPrivateKey> {
            return getPrivateKey(this.getDerivationPath())
        },
        getPublicKey(): Promise<ExtendedPublicKey> {
            return getPublicKey(this.getDerivationPath())
        }
    })
}
