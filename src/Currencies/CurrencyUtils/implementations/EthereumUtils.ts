import { ChainGateContext } from '../ChainGateContext'
import { EthereumInfo } from '../../CurrencyInfo'
import { EvmCurrencyUtils } from '../abstract/EvmCurrencyUtils'

export class EthereumUtils extends EvmCurrencyUtils<typeof EthereumInfo> {
    constructor(context: ChainGateContext) {
        super(context, EthereumInfo, 'ethereum')
    }
}
