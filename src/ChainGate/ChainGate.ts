import { Client, createClient, createConfig } from '../Client/client';
import { ClientOptions, getGlobalMarkets } from '../Client';
import type { MarketsResponse } from '../Client';
import { UtxoExplorer } from '../Explorer/UtxoExplorer';
import { EvmExplorer } from '../Explorer/EvmExplorer';
import { GlobalExplorer } from '../Explorer/GlobalExplorer';
import { EvmConnector } from '../Connector/EvmConnector/EvmConnector';
import { EvmRpcConnector } from '../Connector/EvmRpcConnector/EvmRpcConnector';
import { EvmRpcExplorer } from '../Connector/EvmRpcConnector/EvmRpcExplorer';
import { UtxoConnector } from '../Connector/UtxoConnector/UtxoConnector';
import { BchConnector } from '../Connector/UtxoConnector/BchConnector/BchConnector';
import { UnsupportedOperationError, RateLimitError, RateLimitQuotaError } from '../errors';
import {
  createNetworkCollection,
  NetworkDescriptor,
  UtxoNetworkDescriptor,
  BchNetworkDescriptor,
  EvmNetworkDescriptor,
  EvmRpcNetworkDescriptor,
} from './networks';
import type { NetworkCollection } from './networks';
import type { Wallet } from '../Wallet/Wallet';
import { TTLCache } from '../utils/TTLCache';
import { UtxoLocalCache } from '../utils/UtxoLocalCache';
import { RpcUrls } from './RpcUrls';

const BASE_URL = 'https://api.chaingate.dev';

/** Default TTL for the markets cache: 60 seconds. */
const MARKETS_TTL = 60_000;

/** Shared state created by {@link ChainGate} and threaded into explorers/connectors. */
export interface ChainGateGlobal {
  marketsCache: TTLCache<MarketsResponse>;
  utxoCache: UtxoLocalCache;
}

/**
 * Main client for the ChainGate blockchain API.
 *
 * Provides access to the ChainGate API for querying blockchain data
 * across EVM and UTXO networks.
 *
 * @example
 * ```ts
 * import { ChainGate } from 'chaingate';
 *
 * const cg = new ChainGate({ apiKey: 'your-api-key' });
 *
 * const btc = cg.explore(cg.networks.bitcoin);    // UtxoExplorer
 * const eth = cg.explore(cg.networks.ethereum);   // EvmExplorer
 * ```
 */
export class ChainGate {
  private readonly client: Client;
  private readonly apiKey: string;
  private readonly _networks: NetworkCollection;
  private readonly _rpcUrls: RpcUrls;

  /** @internal Shared state passed to explorers and connectors. */
  public readonly global: ChainGateGlobal;

  /**
   * Returns a `UtxoExplorer` for the given UTXO network.
   */
  public explore(network: UtxoNetworkDescriptor): UtxoExplorer;
  /**
   * Returns an `EvmExplorer` for the given EVM network.
   */
  public explore(network: EvmNetworkDescriptor): EvmExplorer;
  /**
   * Returns an `EvmRpcExplorer` for a custom EVM RPC network.
   */
  public explore(network: EvmRpcNetworkDescriptor): EvmRpcExplorer;
  public explore(
    network: UtxoNetworkDescriptor | EvmNetworkDescriptor | EvmRpcNetworkDescriptor,
  ): UtxoExplorer | EvmExplorer | EvmRpcExplorer {
    if (network instanceof EvmRpcNetworkDescriptor) {
      return new EvmRpcExplorer(network.rpcUrl, network.chainId);
    }
    if (network instanceof UtxoNetworkDescriptor) {
      return new UtxoExplorer(this.client, network.id, BASE_URL, this.apiKey, this.global);
    }
    if (network instanceof EvmNetworkDescriptor) {
      return new EvmExplorer(this.client, network.id, BASE_URL, this.apiKey, this.global);
    }
    throw new UnsupportedOperationError(`Unknown network: ${(network as NetworkDescriptor).id}`);
  }

  /**
   * Returns a {@link GlobalExplorer} for querying cross-network data such as
   * market prices, fiat exchange rates, real-time network information, and
   * network logos — including networks that don't have dedicated `/evm` or
   * `/utxo` endpoints.
   *
   * @example
   * ```ts
   * const global = cg.exploreGlobal();
   *
   * const markets = await global.getMarkets();
   * const info    = await global.getNetworksInfo();
   * const logoUrl = global.getNetworkLogoUrl('berachain');
   * ```
   */
  public exploreGlobal(): GlobalExplorer {
    return new GlobalExplorer(this.client, BASE_URL, this.apiKey, this.global);
  }

  /**
   * Returns the collection of all supported networks.
   *
   * The returned object is iterable (like an array) **and** has named
   * properties for direct access:
   *
   * ```ts
   * // Direct access
   * cg.networks.bitcoin   // UtxoNetworkDescriptor
   * cg.networks.ethereum  // EvmNetworkDescriptor
   *
   * // Iteration
   * for (const net of cg.networks) { ... }
   * ```
   */
  public get networks(): NetworkCollection {
    return this._networks;
  }

  /**
   * Pre-built JSON-RPC endpoint URLs for every network supported by the
   * ChainGate RPC proxy, with the API key already appended.
   *
   * Useful for passing to external libraries (ethers, viem, etc.) or to
   * {@link NetworkCollection.evmRpc | `cg.networks.evmRpc()`}.
   *
   * @example
   * ```ts
   * // Use with evmRpc connector
   * const polygon = cg.networks.evmRpc({
   *   rpcUrl: cg.rpcUrls.polygon,
   *   chainId: 137,
   *   name: 'Polygon',
   *   symbol: 'POL',
   * });
   *
   * // Or pass to any JSON-RPC library
   * const provider = new ethers.JsonRpcProvider(cg.rpcUrls.ethereum);
   * ```
   */
  public get rpcUrls(): RpcUrls {
    return this._rpcUrls;
  }

  /**
   * Connects a wallet to a network, returning a connector with address derivation,
   * balance queries, transaction broadcasting, and smart contract calls.
   *
   * @example
   * ```ts
   * const connector = cg.connect(cg.networks.ethereum, wallet);
   * const address = await connector.getAddress();
   * ```
   */
  public connect(network: BchNetworkDescriptor, wallet: Wallet): BchConnector;
  public connect(network: EvmNetworkDescriptor, wallet: Wallet): EvmConnector;
  public connect(network: EvmRpcNetworkDescriptor, wallet: Wallet): EvmRpcConnector;
  public connect(network: UtxoNetworkDescriptor, wallet: Wallet): UtxoConnector;
  public connect(
    network:
      | BchNetworkDescriptor
      | EvmNetworkDescriptor
      | EvmRpcNetworkDescriptor
      | UtxoNetworkDescriptor,
    wallet: Wallet,
  ): EvmConnector | EvmRpcConnector | UtxoConnector | BchConnector {
    if (network instanceof BchNetworkDescriptor) {
      const explorer = new UtxoExplorer(
        this.client,
        network.id,
        BASE_URL,
        this.apiKey,
        this.global,
      );
      return new BchConnector(wallet, explorer, network);
    }
    if (network instanceof EvmRpcNetworkDescriptor) {
      const explorer = new EvmRpcExplorer(network.rpcUrl, network.chainId);
      return new EvmRpcConnector(wallet, explorer, network);
    }
    if (network instanceof EvmNetworkDescriptor) {
      const explorer = new EvmExplorer(this.client, network.id, BASE_URL, this.apiKey, this.global);
      return new EvmConnector(wallet, explorer, network);
    }
    if (network instanceof UtxoNetworkDescriptor) {
      const explorer = new UtxoExplorer(
        this.client,
        network.id,
        BASE_URL,
        this.apiKey,
        this.global,
      );
      return new UtxoConnector(wallet, explorer, network);
    }
    throw new UnsupportedOperationError(
      `Unsupported network for connect: ${(network as NetworkDescriptor).id}`,
    );
  }

  /**
   * @param options - Configuration options.
   * @param options.apiKey - Your ChainGate API key.
   */
  constructor({ apiKey }: { apiKey: string }) {
    this.apiKey = apiKey;
    this.client = createClient(
      createConfig<ClientOptions>({
        baseUrl: BASE_URL,
        headers: { 'x-api-key': apiKey },
        throwOnError: true,
      }),
    );

    const client = this.client;
    this.global = {
      marketsCache: new TTLCache<MarketsResponse>(async () => {
        const { data } = await getGlobalMarkets({ client, throwOnError: true });
        return data;
      }, MARKETS_TTL),
      utxoCache: new UtxoLocalCache(),
    };

    this.client.interceptors.error.use((_error, response) => {
      if (response?.status === 429) {
        return apiKey ? new RateLimitQuotaError() : new RateLimitError();
      }
      return _error;
    });

    this._networks = createNetworkCollection(this.global.marketsCache, apiKey);
    this._rpcUrls = new RpcUrls(apiKey);
  }
}
