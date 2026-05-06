import type { Client } from '../Client/client';
import {
  getEvmNetworkAddressBalance,
  getEvmNetworkAddressHistory,
  getEvmNetworkAddressTokenBalances,
  getEvmNetworkAddressTransactionCount,
  getEvmNetworkBlockByHash,
  getEvmNetworkBlockByHeight,
  getEvmNetworkEstimateGas,
  getEvmNetworkFeeRate,
  getEvmNetworkLatestBlock,
  getEvmNetworkNetworkStatus,
  getEvmNetworkNftMetadata,
  getEvmNetworkNonce,
  getEvmNetworkTokenData,
  getEvmNetworkTransactionDetails,
  postEvmNetworkBroadcastTransaction,
  postEvmNetworkCallSmartContractFunction,
} from '../Client';
import type {
  EvmAddressHistoryResponse,
  EvmAddressTxCountResponse,
  EvmBlockResponse,
  EvmBlockByHeightResponse,
  EvmBroadcastTxResponse,
  EvmCallContractBody,
  EvmCallContractResponse,
  EvmEstimateGasResponse,
  EvmFeeRateResponse,
  EvmLatestBlockResponse,
  EvmNetworkStatusResponse,
  EvmNftMetadataResponse,
  EvmNonceResponse,
  EvmTokenDataResponse,
  EvmTxDetailsResponse,
} from '../Client';
import { Amount } from '../utils/Amount';
import type { AmountData } from '../utils/Amount';
import { NETWORKS_INFO } from '../ChainGate/networks';
import type { ChainGateGlobal } from '../ChainGate/ChainGate';

export type EvmNetwork = 'ethereum' | 'avalanche';

const EVM_DECIMALS = 18;

export class EvmExplorer {
  /** @internal */
  readonly client: Client;
  /** @internal */
  readonly network: EvmNetwork;
  /** @internal */
  readonly baseUrl: string;
  /** @internal */
  readonly apiKey: string | undefined;
  /** @internal */
  readonly global: ChainGateGlobal;

  constructor(
    client: Client,
    network: EvmNetwork,
    baseUrl: string,
    apiKey: string | undefined,
    global: ChainGateGlobal,
  ) {
    this.client = client;
    this.network = network;
    this.baseUrl = baseUrl;
    this.apiKey = apiKey;
    this.global = global;
  }

  /** Returns the native coin data for this network. */
  private nativeData(): AmountData {
    const info = NETWORKS_INFO[this.network];
    return {
      symbol: info.nativeToken.symbol,
      name: info.nativeToken.name,
      network: this.network,
    };
  }

  /**
   * Returns the confirmed and unconfirmed balance for an EVM address.
   *
   * The `confirmed` and `unconfirmed` fields are returned as `Amount` instances
   * with native token metadata (symbol, name, network).
   */
  public async getAddressBalance(address: string): Promise<{
    address: string;
    confirmed: Amount;
    unconfirmed: Amount;
  }> {
    const { data } = await getEvmNetworkAddressBalance({
      client: this.client,
      path: { network: this.network },
      query: { address },
      throwOnError: true,
    });
    const ad = this.nativeData();
    const cache = this.global.marketsCache;
    return {
      address: data.address,
      confirmed: new Amount(BigInt(data.confirmedWei), EVM_DECIMALS, ad, cache),
      unconfirmed: Amount.fromDecimal(data.unconfirmed, EVM_DECIMALS, ad, cache),
    };
  }

  /**
   * Returns paginated transaction history for an EVM address, including decoded
   * contract events (transfers, mints, approvals, etc.).
   */
  public async getAddressHistory(
    address: string,
    page?: string,
  ): Promise<EvmAddressHistoryResponse> {
    const { data } = await getEvmNetworkAddressHistory({
      client: this.client,
      path: { network: this.network },
      query: { address, page },
      throwOnError: true,
    });
    return data;
  }

  /**
   * Returns all ERC-20/ERC-721/ERC-1155 token balances for an EVM address.
   *
   * Each balance is returned as an {@link Amount} instance. Use `isToken` and
   * `isNFT` to distinguish token types, and access `contractAddress` or
   * `ownedTokens` accordingly.
   */
  public async getAddressTokenBalances(address: string): Promise<Amount[]> {
    const { data } = await getEvmNetworkAddressTokenBalances({
      client: this.client,
      path: { network: this.network },
      query: { address },
      throwOnError: true,
    });
    return data.tokens.map((token) => {
      const decimals = token.token.decimals ?? 0;
      const ad: AmountData = {
        symbol: token.token.symbol ?? '',
        name: token.token.name ?? '',
        network: this.network,
        contractAddress: token.contractAddress,
        ownedTokens: token.ownedTokens?.map((nft) => ({ id: nft.id, uri: nft.uri })),
      };
      return new Amount(BigInt(token.balance), decimals, ad, this.global.marketsCache);
    });
  }

  /**
   * Returns the nonce (transaction count) for an EVM address.
   */
  public async getAddressTransactionCount(address: string): Promise<EvmAddressTxCountResponse> {
    const { data } = await getEvmNetworkAddressTransactionCount({
      client: this.client,
      path: { network: this.network },
      query: { address },
      throwOnError: true,
    });
    return data;
  }

  /**
   * Returns the next nonce to use when sending a transaction from an EVM address.
   */
  public async getNonce(address: string): Promise<EvmNonceResponse> {
    const { data } = await getEvmNetworkNonce({
      client: this.client,
      path: { network: this.network },
      query: { address },
      throwOnError: true,
    });
    return data;
  }

  /**
   * Returns detailed information about a transaction by its hash.
   *
   * The `amount` field is returned as an `Amount` instance with native token metadata.
   */
  public async getTransactionDetails(transactionId: string): Promise<
    Omit<EvmTxDetailsResponse, 'amount'> & {
      amount: Amount;
    }
  > {
    const { data } = await getEvmNetworkTransactionDetails({
      client: this.client,
      path: { network: this.network },
      query: { transactionId },
      throwOnError: true,
    });
    return {
      ...data,
      amount: Amount.fromDecimal(
        data.amount,
        EVM_DECIMALS,
        this.nativeData(),
        this.global.marketsCache,
      ),
    };
  }

  /**
   * Returns block details for the given block hash.
   */
  public async getBlockByHash(blockHash: string): Promise<EvmBlockResponse> {
    const { data } = await getEvmNetworkBlockByHash({
      client: this.client,
      path: { network: this.network },
      query: { blockHash },
      throwOnError: true,
    });
    return data;
  }

  /**
   * Returns block details for the given block height.
   */
  public async getBlockByHeight(blockHeight: string): Promise<EvmBlockByHeightResponse> {
    const { data } = await getEvmNetworkBlockByHeight({
      client: this.client,
      path: { network: this.network },
      query: { blockHeight },
      throwOnError: true,
    });
    return data;
  }

  /**
   * Returns the latest block number and hash.
   */
  public async getLatestBlock(): Promise<EvmLatestBlockResponse> {
    const { data } = await getEvmNetworkLatestBlock({
      client: this.client,
      path: { network: this.network },
      throwOnError: true,
    });
    return data;
  }

  /**
   * Estimates the gas required for a transaction.
   */
  public async estimateGas(params: {
    addressFrom: string;
    addressTo: string;
    nonce: string;
    amount: string;
    data?: string;
  }): Promise<EvmEstimateGasResponse> {
    const { data } = await getEvmNetworkEstimateGas({
      client: this.client,
      path: { network: this.network },
      query: params,
      throwOnError: true,
    });
    return data;
  }

  /**
   * Returns the current fee rate recommendations (low, normal, high, maximum).
   *
   * Each tier contains EIP-1559 fee parameters (`maxFeePerGasGwei`,
   * `maxPriorityFeePerGasGwei`) and an estimated confirmation time.
   */
  public async getFeeRate(): Promise<EvmFeeRateResponse> {
    const { data } = await getEvmNetworkFeeRate({
      client: this.client,
      path: { network: this.network },
      throwOnError: true,
    });
    return data;
  }

  /**
   * Returns current network status including block time, gas usage, and fee predictions.
   */
  public async getNetworkStatus(): Promise<EvmNetworkStatusResponse> {
    const { data } = await getEvmNetworkNetworkStatus({
      client: this.client,
      path: { network: this.network },
      throwOnError: true,
    });
    return data;
  }

  /**
   * Returns the URL endpoint for the SVG logo of this EVM network.
   */
  public getLogoUrl(): string {
    const suffix = this.apiKey ? `?api_key=${encodeURIComponent(this.apiKey)}` : '';
    return `${this.baseUrl}/evm/${this.network}/logo${suffix}`;
  }

  /**
   * Returns metadata and on-chain information for a token contract.
   */
  public async getTokenData(contractAddress: string): Promise<EvmTokenDataResponse> {
    const { data } = await getEvmNetworkTokenData({
      client: this.client,
      path: { network: this.network },
      query: { contractAddress },
      throwOnError: true,
    });
    return data;
  }

  /**
   * Returns the URL endpoint for a token contract logo (PNG or SVG).
   */
  public getTokenLogoUrl(address: string): string {
    const params = new URLSearchParams({ address });
    if (this.apiKey) params.set('api_key', this.apiKey);
    return `${this.baseUrl}/evm/${this.network}/tokenLogo?${params.toString()}`;
  }

  /**
   * Returns the full decoded metadata for a specific NFT token.
   */
  public async getNftMetadata(
    contractAddress: string,
    tokenId: string,
  ): Promise<EvmNftMetadataResponse> {
    const { data } = await getEvmNetworkNftMetadata({
      client: this.client,
      path: { network: this.network },
      query: { contractAddress, tokenId },
      throwOnError: true,
    });
    return data;
  }

  /**
   * Returns the URL endpoint for a specific NFT token image.
   */
  public getNftImageUrl(contractAddress: string, tokenId: string): string {
    const params = new URLSearchParams({ contractAddress, tokenId });
    if (this.apiKey) params.set('api_key', this.apiKey);
    return `${this.baseUrl}/evm/${this.network}/nft/metadata/image?${params.toString()}`;
  }

  /**
   * Returns the URL endpoint for a specific NFT token animation/video.
   */
  public getNftAnimationUrl(contractAddress: string, tokenId: string): string {
    const params = new URLSearchParams({ contractAddress, tokenId });
    if (this.apiKey) params.set('api_key', this.apiKey);
    return `${this.baseUrl}/evm/${this.network}/nft/metadata/animation?${params.toString()}`;
  }

  /**
   * Broadcasts a signed raw transaction to the EVM network.
   */
  public async broadcastTransaction(transactionRaw: string): Promise<EvmBroadcastTxResponse> {
    const { data } = await postEvmNetworkBroadcastTransaction({
      client: this.client,
      path: { network: this.network },
      body: { transactionRaw },
      throwOnError: true,
    });
    return data;
  }

  /**
   * Executes a read-only (eth_call) call against a smart contract.
   */
  public async callSmartContract(body: EvmCallContractBody): Promise<EvmCallContractResponse> {
    const { data } = await postEvmNetworkCallSmartContractFunction({
      client: this.client,
      path: { network: this.network },
      body,
      throwOnError: true,
    });
    return data;
  }
}
