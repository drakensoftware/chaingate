import { EvmWallet } from './EvmWallet/EvmWallet'
import { EthereumInfo } from '../../CurrencyInfo'

export class EthereumWallet extends EvmWallet<typeof EthereumInfo> {}
