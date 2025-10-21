import { Transports } from '../Currencies/CurrencyWallet/Transports'
import { CurrencyWallet } from '../Currencies/CurrencyWallet/CurrencyWallet'
import { AllCurrencies, CurrencyModules } from '../Currencies/CurrencyModules'
import { CurrencyUtils } from '../Currencies/CurrencyUtils/CurrencyUtils'
import { ChainGateContext } from '../Currencies/CurrencyUtils/ChainGateContext'

export type WalletOf<C extends keyof typeof CurrencyModules> = InstanceType<
    (typeof CurrencyModules)[C]['wallet']
>
export type InfoOf<C extends keyof typeof CurrencyModules> = (typeof CurrencyModules)[C]['info']

export type SerializedWallet = {
    format: 'ChainGate Serialize Wallet Format Version 2'
    walletType: string
    walletUniqueId: string
}

export abstract class Wallet<SupportedCurrencies extends (typeof AllCurrencies)[number]> {
    protected abstract supportedCurrencies: readonly SupportedCurrencies[]

    public get client() {
        return this.context.client
    }
    protected readonly context: ChainGateContext
    protected readonly transports: Transports

    protected constructor(context: ChainGateContext, transports: Transports) {
        this.context = context
        this.transports = transports
    }

    currency<C extends SupportedCurrencies>(id: C) {
        const module = CurrencyModules[id]
        const utils = new module.utils(this.context)
        const WalletClass = module.wallet as new (
            utils: CurrencyUtils<InfoOf<C>>,
            transports: Transports,
        ) => CurrencyWallet<InfoOf<C>>
        return new WalletClass(utils, this.transports) as WalletOf<C>
    }

    public get allCurrencies(): Array<CurrencyWallet<InfoOf<SupportedCurrencies>>> {
        return this.supportedCurrencies.map((c) => this.currency(c))
    }

    abstract getWalletUniqueId(): Promise<string>
    protected abstract serializeInternal(): Promise<SerializedWallet>

    async serialize(): Promise<string> {
        return JSON.stringify(await this.serializeInternal())
    }

    async getAllBalances() {
        return Promise.all(
            this.allCurrencies.map(async (w) => ({
                currency: w.utils.currencyInfo,
                balance: await w.getBalance(),
            })),
        )
    }

    static isSerializedWallet(serialized: object): boolean {
        if (!('format' in serialized)) return false
        if (serialized.format !== 'ChainGate Serialize Wallet Format Version 2') return false
        if (!('walletType' in serialized)) return false
        return 'walletUniqueId' in serialized
    }
}
