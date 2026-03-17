import { Amount } from '../../utils/Amount';
import type { AmountData, BaseValue } from '../../utils/Amount';
import type { MarketsResponse } from '../../Client';
import type { TTLCache } from '../../utils/TTLCache';
import { publicKeyToEthAddress, isValidEvmAddress } from '../../utils/crypto';
import { signEvmMessage, verifyEvmMessage } from '../../utils/messageSigning';
import type { EvmAddressType, AddressTypeConfig } from './types';

/**
 * Configuration for a custom EVM network accessed via a direct JSON-RPC
 * connection.
 */
export interface EvmRpcConfig {
  /** JSON-RPC endpoint URL. */
  rpcUrl: string;
  /** EVM chain ID (e.g. 56 for BSC, 42161 for Arbitrum). */
  chainId: number;
  /** Human-readable network name (e.g. "BNB Smart Chain"). */
  name: string;
  /** Native coin ticker symbol (e.g. "BNB"). */
  symbol: string;
  /** Human-readable name for the native token (e.g. "Binance Coin"). Defaults to {@link name}. */
  nativeTokenName?: string;
  /** Number of decimals for the native coin. Defaults to `18`. */
  decimals?: number;
  /** Whether this is a testnet. Defaults to `false`. */
  isTestnet?: boolean;
}

/**
 * Describes a custom EVM network that communicates directly with a JSON-RPC
 * endpoint. Created via `cg.networks.evmRpc({ ... })`.
 *
 * This descriptor carries the same metadata as a regular
 * {@link NetworkDescriptor} but is **not** tied to the ChainGate API. Features
 * that require an indexer (transaction history, token balances, etc.) are not
 * available.
 *
 * @example
 * ```ts
 * const cg = new ChainGate({ apiKey: '...' });
 * const bsc = cg.networks.evmRpc({
 *   rpcUrl: 'https://bsc-dataseed.binance.org',
 *   chainId: 56,
 *   name: 'BNB Smart Chain',
 *   symbol: 'BNB',
 * });
 *
 * const conn = cg.connect(bsc, wallet);
 * ```
 */
export class EvmRpcNetworkDescriptor {
  /** JSON-RPC endpoint URL. */
  readonly rpcUrl: string;
  readonly name: string;
  readonly symbol: string;
  readonly type = 'evm' as const;
  readonly decimals: number;
  readonly isTestnet: boolean;
  readonly hasOwnToken = true as const;
  readonly nativeToken: { readonly symbol: string; readonly name: string };
  readonly chainId: number;
  readonly defaultAddressType: EvmAddressType = 'eoa';
  readonly addressTypes: Partial<Record<EvmAddressType, AddressTypeConfig>>;

  /** @internal */
  private readonly marketsCache: TTLCache<MarketsResponse>;

  /** @internal */
  constructor(config: EvmRpcConfig, marketsCache: TTLCache<MarketsResponse>) {
    this.rpcUrl = config.rpcUrl;
    this.name = config.name;
    this.symbol = config.symbol;
    this.decimals = config.decimals ?? 18;
    this.isTestnet = config.isTestnet ?? false;
    this.chainId = config.chainId;
    this.nativeToken = {
      symbol: config.symbol,
      name: config.nativeTokenName ?? config.name,
    };
    this.addressTypes = {
      eoa: { derivationPath: "m/44'/60'/0'/0" },
    };
    this.marketsCache = marketsCache;
  }

  /**
   * Derives an EIP-55 checksummed Ethereum address from a public key.
   *
   * @param publicKey - Compressed or uncompressed secp256k1 public key.
   */
  public publicKeyToAddress(publicKey: Uint8Array): string {
    return publicKeyToEthAddress(publicKey);
  }

  /**
   * Checks whether a string is a valid EVM address.
   *
   * Accepts both checksummed and all-lowercase/all-uppercase forms.
   * When the address uses mixed case, the EIP-55 checksum is verified.
   *
   * @param address - The address string to validate.
   * @returns `true` if the address is valid.
   */
  public isValidAddress(address: string): boolean {
    return isValidEvmAddress(address);
  }

  /**
   * Creates an {@link Amount} in base units of the native coin.
   *
   * @example
   * ```ts
   * const bsc = cg.networks.evmRpc({ ... });
   * const amount = bsc.amount('0.1');
   * ```
   */
  public amount(value: BaseValue): Amount {
    return Amount.fromDecimal(value, this.decimals, this.nativeAmountData(), this.marketsCache);
  }

  /**
   * Creates an {@link Amount} from the smallest unit (e.g. wei).
   * @internal
   */
  public amountFromSmallestUnit(value: bigint): Amount {
    return new Amount(value, this.decimals, this.nativeAmountData(), this.marketsCache);
  }

  /**
   * Signs a message using EIP-191 personal sign.
   *
   * @param message - The message to sign (string or raw bytes).
   * @param privateKey - The 32-byte secp256k1 private key.
   * @returns The 65-byte signature as a hex string with `0x` prefix.
   */
  public signMessage(message: string | Uint8Array, privateKey: Uint8Array): string {
    return signEvmMessage(message, privateKey);
  }

  /**
   * Verifies an EIP-191 personal sign signature.
   *
   * @param message - The original message.
   * @param signature - The signature hex string (with `0x` prefix).
   * @param address - The expected signer address.
   * @returns `true` if the signature is valid.
   */
  public verifyMessage(message: string | Uint8Array, signature: string, address: string): boolean {
    return verifyEvmMessage(message, signature, address);
  }

  /** Returns the network name. */
  toString(): string {
    return this.name;
  }

  /** @internal */
  private nativeAmountData(): AmountData {
    return {
      symbol: this.nativeToken.symbol,
      name: this.nativeToken.name,
      network: this.name,
    };
  }
}
