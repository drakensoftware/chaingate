import type { UtxoNetwork } from '../../Explorer/UtxoExplorer';
import type { EvmNetwork } from '../../Explorer/EvmExplorer';

export type Network = UtxoNetwork | EvmNetwork;

/**
 * Bitcoin-style network parameters for address encoding/decoding and
 * transaction signing.
 */
export interface UtxoNetworkParams {
  bech32: string;
  pubKeyHash: number;
  scriptHash: number;
  wif: number;
}

/** Address type for UTXO networks (Bitcoin, Litecoin, Dogecoin, etc.). */
export type UtxoAddressType = 'segwit' | 'legacy' | 'taproot';

/** Address type for Bitcoin Cash. */
export type BchAddressType = 'cashaddr' | 'legacy';

/** Address type for EVM networks. */
export type EvmAddressType = 'eoa';

/**
 * Detailed address type returned by {@link UtxoNetworkDescriptor.identifyAddressType}.
 * Provides granular identification of all recognized UTXO address formats.
 */
export type DetailedUtxoAddressType =
  | 'legacy-p2pkh'
  | 'legacy-p2sh'
  | 'legacy-p2pk'
  | 'legacy-p2ms'
  | 'segwit-p2wpkh'
  | 'segwit-p2wsh'
  | 'taproot-p2tr'
  | 'taproot-n-of-n'
  | 'taproot-m-of-n'
  | 'unknown';

/** Address type used for derivation. */
export type AddressType = UtxoAddressType | BchAddressType | EvmAddressType;

/** Configuration for a single address type. */
export interface AddressTypeConfig {
  /** BIP-44 derivation path (without the trailing index). */
  derivationPath: string;
}

export type NetworkInfo = {
  name: string;
  symbol: string;
  type: 'evm' | 'utxo';
  decimals: number;
  isTestnet: boolean;
  hasOwnToken: boolean;
  nativeToken: {
    symbol: string;
    name: string;
  };
  /** EVM chain ID. Only present for EVM networks. */
  chainId?: number;
  /** Default address type used when none is specified. */
  defaultAddressType: AddressType;
  /** Supported address types with their default derivation paths. */
  addressTypes: Partial<Record<AddressType, AddressTypeConfig>>;
};

/** @internal Full network info including internal fields not exposed via the public API. */
export type NetworkInfoInternal = NetworkInfo & {
  /** Bitcoin-style network params. @internal */
  networkParams?: UtxoNetworkParams;
};
