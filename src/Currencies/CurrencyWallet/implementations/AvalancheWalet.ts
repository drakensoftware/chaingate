import { EvmWallet } from './EvmWallet/EvmWallet'
import { AvalancheInfo } from '../../CurrencyInfo'

export class AvalancheWallet extends EvmWallet<typeof AvalancheInfo> {}
