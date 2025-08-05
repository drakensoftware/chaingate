import { EvmWallet } from './EvmWallet/EvmWallet'
import { ArbitrumInfo } from '../../CurrencyInfo'

export class ArbitrumWallet extends EvmWallet<typeof ArbitrumInfo> {}
