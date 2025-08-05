import { EvmWallet } from './EvmWallet/EvmWallet'
import { PolygonInfo } from '../../CurrencyInfo'

export class PolygonWallet extends EvmWallet<typeof PolygonInfo> {}
