import { EvmWallet } from './EvmWallet/EvmWallet'
import { FantomInfo } from '../../CurrencyInfo'

export class FantomWallet extends EvmWallet<typeof FantomInfo> {}
