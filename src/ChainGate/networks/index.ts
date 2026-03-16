export type {
  Network,
  UtxoAddressType,
  BchAddressType,
  EvmAddressType,
  AddressType,
  AddressTypeConfig,
  NetworkInfo,
  NetworkInfoInternal,
  DetailedUtxoAddressType,
} from './types';

export { NetworkDescriptor } from './NetworkDescriptor';
export { UtxoNetworkDescriptor } from './UtxoNetworkDescriptor';
export { BchNetworkDescriptor } from './BchNetworkDescriptor';
export { EvmNetworkDescriptor } from './EvmNetworkDescriptor';
export { EvmRpcNetworkDescriptor } from './EvmRpcNetworkDescriptor';
export type { EvmRpcConfig } from './EvmRpcNetworkDescriptor';

export { NETWORKS_INFO, createNetworkCollection } from './NetworkCollection';
export type { NetworkCollection } from './NetworkCollection';
