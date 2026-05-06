import type { Client } from '../Client/client';
import { getGlobalNetworksInfo } from '../Client';
import type { GetGlobalLogoNetworkData, MarketsResponse, NetworksInfoResponse } from '../Client';
import type { ChainGateGlobal } from '../ChainGate/ChainGate';

/**
 * Union of all network identifiers accepted by the `/global/logo/{network}`
 * endpoint, including networks beyond those with dedicated `/evm` or `/utxo`
 * endpoints (e.g. Mantle, Celo, Moonbeam, Berachain, etc.).
 */
export type GlobalLogoNetwork = GetGlobalLogoNetworkData['path']['network'];

/**
 * Explorer for the ChainGate global endpoints.
 *
 * Provides access to cross-network market data, real-time network information,
 * and network logos — including networks that don't have dedicated `/evm` or
 * `/utxo` endpoints.
 *
 * @example
 * ```ts
 * const global = cg.exploreGlobal();
 *
 * // Crypto prices and fiat exchange rates
 * const markets = await global.getMarkets();
 *
 * // Real-time info for all supported networks
 * const info = await global.getNetworksInfo();
 *
 * // Logo URL for any supported network
 * const url = global.getNetworkLogoUrl('berachain');
 * ```
 */
export class GlobalExplorer {
  /** @internal */
  private readonly client: Client;
  /** @internal */
  private readonly baseUrl: string;
  /** @internal */
  private readonly apiKey: string | undefined;
  /** @internal */
  private readonly global: ChainGateGlobal;

  constructor(
    client: Client,
    baseUrl: string,
    apiKey: string | undefined,
    global: ChainGateGlobal,
  ) {
    this.client = client;
    this.baseUrl = baseUrl;
    this.apiKey = apiKey;
    this.global = global;
  }

  /**
   * Returns cryptocurrency prices and fiat exchange rates for all supported
   * networks.
   *
   * Results are served from a TTL cache (60 s) shared with the rest of the
   * library, so repeated calls within the TTL window are essentially free.
   */
  public async getMarkets(): Promise<MarketsResponse> {
    return this.global.marketsCache.fetch();
  }

  /**
   * Returns real-time information for all supported EVM networks, including
   * many that don't have dedicated `/evm` endpoints (e.g. Mantle, Celo,
   * Moonbeam, Berachain, etc.).
   *
   * Includes block times, gas usage, and fee predictions.
   */
  public async getNetworksInfo(): Promise<NetworksInfoResponse> {
    const { data } = await getGlobalNetworksInfo({
      client: this.client,
      throwOnError: true,
    });
    return data;
  }

  /**
   * Returns the URL endpoint for the SVG logo of the given network.
   *
   * Accepts any network supported by the global logo endpoint, including
   * networks without dedicated `/evm` or `/utxo` endpoints.
   */
  public getNetworkLogoUrl(network: GlobalLogoNetwork): string {
    const suffix = this.apiKey ? `?api_key=${encodeURIComponent(this.apiKey)}` : '';
    return `${this.baseUrl}/global/logo/${network}${suffix}`;
  }
}
