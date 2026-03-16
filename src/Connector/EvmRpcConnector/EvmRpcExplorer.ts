import { RpcError } from '../../errors';

/** Fee data returned by {@link EvmRpcExplorer.getFeeData}. */
export interface RpcFeeData {
  /** Whether the chain supports EIP-1559 (type-2 transactions). */
  supportsEip1559: boolean;
  /** Max fee per gas in wei (EIP-1559). `undefined` when the chain is legacy-only. */
  maxFeePerGas?: bigint;
  /** Max priority fee per gas in wei (EIP-1559). `undefined` when the chain is legacy-only. */
  maxPriorityFeePerGas?: bigint;
  /** Gas price in wei (legacy). Always present as a fallback. */
  gasPrice: bigint;
}

/** Minimal transaction receipt returned by {@link EvmRpcExplorer.getTransactionReceipt}. */
export interface RpcTransactionReceipt {
  /** Block number the transaction was included in. */
  blockNumber: number;
  /** `1` for success, `0` for revert. */
  status: number;
}

/**
 * Lightweight EVM explorer that communicates directly with a JSON-RPC 2.0
 * endpoint. No dependency on the ChainGate API.
 *
 * Only exposes the subset of RPC methods needed by {@link EvmRpcConnector} and
 * {@link EvmRpcTransaction}.
 */
export class EvmRpcExplorer {
  /** JSON-RPC endpoint URL. */
  readonly rpcUrl: string;
  /** EVM chain ID. */
  readonly chainId: number;

  private nextId = 1;

  constructor(rpcUrl: string, chainId: number) {
    this.rpcUrl = rpcUrl;
    this.chainId = chainId;
  }

  // ---------------------------------------------------------------------------
  // Public RPC helpers
  // ---------------------------------------------------------------------------

  /**
   * Returns the wei balance for an address (`eth_getBalance` at `"latest"`).
   */
  public async getBalance(address: string): Promise<bigint> {
    const hex = await this.call<string>('eth_getBalance', [address, 'latest']);
    return BigInt(hex);
  }

  /**
   * Returns the nonce / transaction count for an address
   * (`eth_getTransactionCount` at `"latest"`).
   */
  public async getTransactionCount(address: string): Promise<bigint> {
    const hex = await this.call<string>('eth_getTransactionCount', [address, 'latest']);
    return BigInt(hex);
  }

  /**
   * Estimates gas for a transaction (`eth_estimateGas`).
   */
  public async estimateGas(params: {
    from: string;
    to: string;
    value: bigint;
    data?: string;
  }): Promise<bigint> {
    const txObj: Record<string, string> = {
      from: params.from,
      to: params.to,
      value: '0x' + params.value.toString(16),
    };
    if (params.data && params.data !== '0x') {
      txObj.data = params.data;
    }
    const hex = await this.call<string>('eth_estimateGas', [txObj]);
    return BigInt(hex);
  }

  /**
   * Returns fee data for the current block.
   *
   * Tries EIP-1559 (`eth_maxPriorityFeePerGas` + `baseFeePerGas` from the
   * latest block). If the chain does not support EIP-1559, falls back to
   * `eth_gasPrice`.
   */
  public async getFeeData(): Promise<RpcFeeData> {
    const gasPrice = await this.getGasPrice();

    try {
      const [priorityFeeHex, block] = await Promise.all([
        this.call<string>('eth_maxPriorityFeePerGas', []),
        this.call<{ baseFeePerGas?: string }>('eth_getBlockByNumber', ['latest', false]),
      ]);

      if (block.baseFeePerGas) {
        const baseFee = BigInt(block.baseFeePerGas);
        const maxPriorityFeePerGas = BigInt(priorityFeeHex);
        // maxFeePerGas = 2 * baseFee + maxPriorityFeePerGas (same heuristic as ethers.js)
        const maxFeePerGas = baseFee * 2n + maxPriorityFeePerGas;
        return {
          supportsEip1559: true,
          maxFeePerGas,
          maxPriorityFeePerGas,
          gasPrice,
        };
      }
    } catch {
      // Chain does not support EIP-1559 — fall through to legacy.
    }

    return { supportsEip1559: false, gasPrice };
  }

  /**
   * Broadcasts a signed raw transaction (`eth_sendRawTransaction`).
   *
   * @returns The transaction hash.
   */
  public async sendRawTransaction(signedTxHex: string): Promise<string> {
    return this.call<string>('eth_sendRawTransaction', [signedTxHex]);
  }

  /**
   * Returns the transaction receipt, or `null` if the transaction is still
   * pending (`eth_getTransactionReceipt`).
   */
  public async getTransactionReceipt(txHash: string): Promise<RpcTransactionReceipt | null> {
    const result = await this.call<{
      blockNumber: string;
      status: string;
    } | null>('eth_getTransactionReceipt', [txHash]);

    if (!result) return null;

    return {
      blockNumber: Number(BigInt(result.blockNumber)),
      status: Number(BigInt(result.status)),
    };
  }

  // ---------------------------------------------------------------------------
  // Internal
  // ---------------------------------------------------------------------------

  /** Returns the current gas price via `eth_gasPrice`. */
  private async getGasPrice(): Promise<bigint> {
    const hex = await this.call<string>('eth_gasPrice', []);
    return BigInt(hex);
  }

  /**
   * Sends a JSON-RPC 2.0 request to the configured endpoint.
   *
   * @throws {RpcError} if the response contains an `error` field or the HTTP
   * request fails.
   */
  private async call<T>(method: string, params: unknown[]): Promise<T> {
    const id = this.nextId++;
    const body = JSON.stringify({ jsonrpc: '2.0', method, params, id });

    let res: Response;
    try {
      res = await fetch(this.rpcUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body,
      });
    } catch (err) {
      throw new RpcError(
        `RPC request to ${this.rpcUrl} failed: ${err instanceof Error ? err.message : String(err)}`,
      );
    }

    if (!res.ok) {
      throw new RpcError(`RPC HTTP error ${res.status}: ${res.statusText}`);
    }

    const json = (await res.json()) as { result?: T; error?: { code: number; message: string } };

    if (json.error) {
      throw new RpcError(json.error.message, json.error.code);
    }

    return json.result as T;
  }
}
