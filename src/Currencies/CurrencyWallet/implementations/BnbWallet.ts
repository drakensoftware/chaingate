import { BnbInfo } from '../../CurrencyInfo'
import { EvmWallet } from './EvmWallet/EvmWallet'

export class BnbWallet extends EvmWallet<typeof BnbInfo> {}
