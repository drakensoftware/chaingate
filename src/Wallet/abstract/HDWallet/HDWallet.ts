import { Seed } from '../../entities/Secret/implementations/Seed'
import { CurrencyWithDerivationPaths } from './CurrencyWithDerivationPaths'
import { Wallet } from '../../Wallet'
import { Transports } from '../../../Currencies/CurrencyWallet/Transports'
import { AllCurrencies, CurrencyModules } from '../../../Currencies/CurrencyModules'
import { Client } from '@hey-api/client-fetch'
import { TtlCache } from '../../../InternalUtils/TtlCache'
import { GlobalMarketsResponse } from '../../../Client'

export type WalletOf<C extends keyof typeof CurrencyModules> = InstanceType<
    (typeof CurrencyModules)[C]['wallet']
>

export abstract class HDWallet<
    DerivationResult,
    SupportedCurrencies extends (typeof AllCurrencies)[number],
> extends Wallet<SupportedCurrencies> {
    abstract getSeed(): Promise<Seed>

    protected derivationPaths: Map<string, string>
    protected derivationResults: Map<string, DerivationResult>

    protected constructor(
        client: Client,
        transports: Transports,
        markets: TtlCache<GlobalMarketsResponse>,
    ) {
        super(client, transports, markets)

        this.derivationPaths = new Map<string, string>()
        this.derivationResults = new Map<string, DerivationResult>()
    }

    protected abstract deriveFromPath(derivationPath: string): Promise<DerivationResult>
    protected async deriveFromPathUsingCache(derivationPath: string): Promise<DerivationResult> {
        let result = this.derivationResults.get(derivationPath)
        if (!result) {
            result = await this.deriveFromPath(derivationPath)
            this.derivationResults.set(derivationPath, result)
        }
        return result
    }

    protected async generateAllCurrencyDefaultDerivations() {
        for (const currency of this.allCurrencies) {
            await this.deriveFromPathUsingCache(currency.utils.currencyInfo.defaultDerivationPath)
            for (const derivationPath of currency.utils.currencyInfo.commonDerivationPaths)
                await this.deriveFromPathUsingCache(derivationPath)
        }
    }

    protected setDerivationPath<C extends SupportedCurrencies>(id: C, derivationPath: string) {
        const currency = this.currency(id)
        return this.derivationPaths.set(currency.utils.currencyInfo.id, derivationPath)
    }

    protected getDerivationPath<C extends SupportedCurrencies>(id: C) {
        const currency = this.currency(id)
        return (
            this.derivationPaths.get(currency.utils.currencyInfo.id) ??
            currency.utils.currencyInfo.defaultDerivationPath
        )
    }

    override currency<C extends SupportedCurrencies>(id: C) {
        const currency = super.currency(id)
        return CurrencyWithDerivationPaths(currency, this.derivationPaths)
    }
}
