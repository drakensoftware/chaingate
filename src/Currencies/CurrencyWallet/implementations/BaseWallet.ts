import { EvmWallet } from './EvmWallet/EvmWallet'
import { BaseInfo } from '../../CurrencyInfo'

export class BaseWallet extends EvmWallet<typeof BaseInfo> {}
