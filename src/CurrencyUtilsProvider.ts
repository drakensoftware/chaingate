import { CurrencyModules } from './Currencies/CurrencyModules'
import { ChainGateContext } from './Currencies/CurrencyUtils/ChainGateContext'

type CurrencyKey = keyof typeof CurrencyModules
type CurrencyUtilsCtor<K extends CurrencyKey> = (typeof CurrencyModules)[K]['utils']
type CurrencyUtilsInst<K extends CurrencyKey> = InstanceType<CurrencyUtilsCtor<K>>

export class CurrencyUtilsProvider {
    private readonly context: ChainGateContext

    constructor(context: ChainGateContext) {
        this.context = context
    }

    currency<C extends keyof typeof CurrencyModules>(id: C): CurrencyUtilsInst<C> {
        const UtilsCtor = CurrencyModules[id].utils as CurrencyUtilsCtor<C>
        return new UtilsCtor(this.context) as CurrencyUtilsInst<C>
    }
}
