import type { MarketsResponse } from '../../Client';
import type { TTLCache } from '../../utils/TTLCache';
import type { Network, NetworkInfoInternal } from './types';
import { NetworkDescriptor } from './NetworkDescriptor';
import { UtxoNetworkDescriptor } from './UtxoNetworkDescriptor';
import { BchNetworkDescriptor } from './BchNetworkDescriptor';
import { EvmNetworkDescriptor } from './EvmNetworkDescriptor';
import { EvmRpcNetworkDescriptor } from './EvmRpcNetworkDescriptor';
import type { EvmRpcConfig } from './EvmRpcNetworkDescriptor';

// ---------------------------------------------------------------------------
// Static network data
// ---------------------------------------------------------------------------

/** @internal */
export const NETWORKS_INFO: Record<Network, NetworkInfoInternal> = {
  bitcoin: {
    name: 'Bitcoin',
    symbol: 'BTC',
    type: 'utxo',
    decimals: 8,
    isTestnet: false,
    hasOwnToken: true,
    nativeToken: { symbol: 'BTC', name: 'Bitcoin' },
    networkParams: { bech32: 'bc', pubKeyHash: 0x00, scriptHash: 0x05, wif: 0x80 },
    defaultAddressType: 'segwit',
    addressTypes: {
      segwit: { derivationPath: "m/84'/0'/0'/0" },
      taproot: { derivationPath: "m/86'/0'/0'/0" },
      legacy: { derivationPath: "m/44'/0'/0'/0" },
    },
  },
  litecoin: {
    name: 'Litecoin',
    symbol: 'LTC',
    type: 'utxo',
    decimals: 8,
    isTestnet: false,
    hasOwnToken: true,
    nativeToken: { symbol: 'LTC', name: 'Litecoin' },
    networkParams: { bech32: 'ltc', pubKeyHash: 0x30, scriptHash: 0x32, wif: 0xb0 },
    defaultAddressType: 'segwit',
    addressTypes: {
      segwit: { derivationPath: "m/84'/2'/0'/0" },
      taproot: { derivationPath: "m/86'/2'/0'/0" },
      legacy: { derivationPath: "m/44'/2'/0'/0" },
    },
  },
  dogecoin: {
    name: 'Dogecoin',
    symbol: 'DOGE',
    type: 'utxo',
    decimals: 8,
    isTestnet: false,
    hasOwnToken: true,
    nativeToken: { symbol: 'DOGE', name: 'Dogecoin' },
    networkParams: { bech32: 'doge', pubKeyHash: 0x1e, scriptHash: 0x16, wif: 0x9e },
    defaultAddressType: 'legacy',
    addressTypes: {
      legacy: { derivationPath: "m/44'/3'/0'/0" },
    },
  },
  bitcoincash: {
    name: 'Bitcoin Cash',
    symbol: 'BCH',
    type: 'utxo',
    decimals: 8,
    isTestnet: false,
    hasOwnToken: true,
    nativeToken: { symbol: 'BCH', name: 'Bitcoin Cash' },
    networkParams: { bech32: 'bc', pubKeyHash: 0x00, scriptHash: 0x05, wif: 0x80 },
    defaultAddressType: 'cashaddr',
    addressTypes: {
      cashaddr: { derivationPath: "m/44'/145'/0'/0" },
      legacy: { derivationPath: "m/44'/145'/0'/0" },
    },
  },
  bitcointestnet: {
    name: 'Bitcoin Testnet',
    symbol: 'tBTC',
    type: 'utxo',
    decimals: 8,
    isTestnet: true,
    hasOwnToken: false,
    nativeToken: { symbol: 'tBTC', name: 'Bitcoin Testnet' },
    networkParams: { bech32: 'tb', pubKeyHash: 0x6f, scriptHash: 0xc4, wif: 0xef },
    defaultAddressType: 'segwit',
    addressTypes: {
      segwit: { derivationPath: "m/84'/1'/0'/0" },
      taproot: { derivationPath: "m/86'/1'/0'/0" },
      legacy: { derivationPath: "m/44'/1'/0'/0" },
    },
  },
  ethereum: {
    name: 'Ethereum',
    symbol: 'ETH',
    type: 'evm',
    decimals: 18,
    isTestnet: false,
    hasOwnToken: true,
    nativeToken: { symbol: 'ETH', name: 'Ether' },
    chainId: 1,
    defaultAddressType: 'eoa',
    addressTypes: {
      eoa: { derivationPath: "m/44'/60'/0'/0" },
    },
  },
};

// ---------------------------------------------------------------------------
// NetworkCollection: array-like object with named properties
// ---------------------------------------------------------------------------

/**
 * A collection of all supported networks.
 *
 * Iterable like an array (via `for...of`, `.forEach`, spread, etc.)
 * **and** provides named properties for direct access:
 *
 * ```ts
 * const cg = new ChainGate({ apiKey: '...' });
 *
 * // Direct access
 * cg.explore(cg.networks.bitcoin);
 *
 * // Iteration
 * for (const net of cg.networks) { ... }
 * ```
 */
export interface NetworkCollection extends ReadonlyArray<NetworkDescriptor> {
  readonly bitcoin: UtxoNetworkDescriptor;
  readonly litecoin: UtxoNetworkDescriptor;
  readonly dogecoin: UtxoNetworkDescriptor;
  readonly bitcoincash: BchNetworkDescriptor;
  readonly bitcointestnet: UtxoNetworkDescriptor;
  readonly ethereum: EvmNetworkDescriptor;

  /**
   * Creates a descriptor for a custom EVM network accessible via a direct
   * JSON-RPC endpoint.
   *
   * The returned {@link EvmRpcNetworkDescriptor} can be passed to
   * `cg.connect()` to obtain an {@link EvmRpcConnector}.
   *
   * @example
   * ```ts
   * const bsc = cg.networks.evmRpc({
   *   rpcUrl: 'https://bsc-dataseed.binance.org',
   *   chainId: 56,
   *   name: 'BNB Smart Chain',
   *   symbol: 'BNB',
   * });
   * const conn = cg.connect(bsc, wallet);
   * ```
   */
  evmRpc(config: EvmRpcConfig): EvmRpcNetworkDescriptor;
}

/** @internal Builds the {@link NetworkCollection} for a {@link ChainGate} instance. */
export function createNetworkCollection(
  marketsCache: TTLCache<MarketsResponse>,
  apiKey: string,
): NetworkCollection {
  const bitcoin = new UtxoNetworkDescriptor('bitcoin', NETWORKS_INFO.bitcoin, marketsCache, apiKey);
  const litecoin = new UtxoNetworkDescriptor(
    'litecoin',
    NETWORKS_INFO.litecoin,
    marketsCache,
    apiKey,
  );
  const dogecoin = new UtxoNetworkDescriptor(
    'dogecoin',
    NETWORKS_INFO.dogecoin,
    marketsCache,
    apiKey,
  );
  const bitcoincash = new BchNetworkDescriptor(NETWORKS_INFO.bitcoincash, marketsCache, apiKey);
  const bitcointestnet = new UtxoNetworkDescriptor(
    'bitcointestnet',
    NETWORKS_INFO.bitcointestnet,
    marketsCache,
    apiKey,
  );
  const ethereum = new EvmNetworkDescriptor(
    'ethereum',
    NETWORKS_INFO.ethereum,
    marketsCache,
    apiKey,
  );

  const all: NetworkDescriptor[] = [
    bitcoin,
    litecoin,
    dogecoin,
    bitcoincash,
    bitcointestnet,
    ethereum,
  ];

  const evmRpc = (config: EvmRpcConfig): EvmRpcNetworkDescriptor => {
    return new EvmRpcNetworkDescriptor(config, marketsCache);
  };

  const collection = all as NetworkDescriptor[] & {
    bitcoin: UtxoNetworkDescriptor;
    litecoin: UtxoNetworkDescriptor;
    dogecoin: UtxoNetworkDescriptor;
    bitcoincash: BchNetworkDescriptor;
    bitcointestnet: UtxoNetworkDescriptor;
    ethereum: EvmNetworkDescriptor;
    evmRpc: (config: EvmRpcConfig) => EvmRpcNetworkDescriptor;
  };

  Object.defineProperties(collection, {
    bitcoin: { value: bitcoin, writable: false, enumerable: false },
    litecoin: { value: litecoin, writable: false, enumerable: false },
    dogecoin: { value: dogecoin, writable: false, enumerable: false },
    bitcoincash: { value: bitcoincash, writable: false, enumerable: false },
    bitcointestnet: { value: bitcointestnet, writable: false, enumerable: false },
    ethereum: { value: ethereum, writable: false, enumerable: false },
    evmRpc: { value: evmRpc, writable: false, enumerable: false },
  });

  return Object.freeze(collection) as NetworkCollection;
}
