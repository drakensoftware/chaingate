const BASE_URL = 'https://api.chaingate.dev';

/** Network identifiers accepted by the ChainGate RPC proxy. */
export type RpcNetwork =
  | 'bitcoin'
  | 'bitcointestnet'
  | 'bitcoincash'
  | 'litecoin'
  | 'dogecoin'
  | 'ethereum'
  | 'sonic'
  | 'polygon'
  | 'arbitrum'
  | 'avalanche'
  | 'bnb'
  | 'base';

/**
 * Provides pre-built JSON-RPC endpoint URLs for every network supported by the
 * ChainGate RPC proxy.
 *
 * Each property returns a fully-qualified URL ready to be used with any
 * JSON-RPC client (ethers, viem, bitcoinjs, etc.) or with
 * {@link ChainGate.networks.evmRpc | `cg.networks.evmRpc()`}. When a
 * ChainGate API key is configured, it is appended automatically.
 *
 * @example
 * ```ts
 * const cg = new ChainGate();
 *
 * // Use directly
 * console.log(cg.rpcUrls.ethereum);
 * // → "https://api.chaingate.dev/rpc/ethereum"
 *
 * // Combine with evmRpc connector
 * const polygon = cg.networks.evmRpc({
 *   rpcUrl: cg.rpcUrls.polygon,
 *   chainId: 137,
 *   name: 'Polygon',
 *   symbol: 'POL',
 * });
 * ```
 */
export class RpcUrls {
  readonly bitcoin: string;
  readonly bitcoinTestnet: string;
  readonly bitcoincash: string;
  readonly litecoin: string;
  readonly dogecoin: string;
  readonly ethereum: string;
  readonly sonic: string;
  readonly polygon: string;
  readonly arbitrum: string;
  readonly avalanche: string;
  readonly bnb: string;
  readonly base: string;

  private readonly _apiKey: string | undefined;

  /** @internal */
  constructor(apiKey?: string) {
    this._apiKey = apiKey;
    this.bitcoin = buildRpcUrl('bitcoin', apiKey);
    this.bitcoinTestnet = buildRpcUrl('bitcointestnet', apiKey);
    this.bitcoincash = buildRpcUrl('bitcoincash', apiKey);
    this.litecoin = buildRpcUrl('litecoin', apiKey);
    this.dogecoin = buildRpcUrl('dogecoin', apiKey);
    this.ethereum = buildRpcUrl('ethereum', apiKey);
    this.sonic = buildRpcUrl('sonic', apiKey);
    this.polygon = buildRpcUrl('polygon', apiKey);
    this.arbitrum = buildRpcUrl('arbitrum', apiKey);
    this.avalanche = buildRpcUrl('avalanche', apiKey);
    this.bnb = buildRpcUrl('bnb', apiKey);
    this.base = buildRpcUrl('base', apiKey);
  }

  /**
   * Returns the RPC URL for any supported network by its identifier.
   *
   * @example
   * ```ts
   * const url = cg.rpcUrls.get('polygon');
   * // → "https://api.chaingate.dev/rpc/polygon"
   * ```
   */
  public get(network: RpcNetwork): string {
    return buildRpcUrl(network, this._apiKey);
  }
}

/** @internal */
export function buildRpcUrl(network: RpcNetwork, apiKey?: string): string {
  return apiKey
    ? `${BASE_URL}/rpc/${network}?api_key=${encodeURIComponent(apiKey)}`
    : `${BASE_URL}/rpc/${network}`;
}
