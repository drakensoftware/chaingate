import Decimal from 'decimal.js';
import { Amount } from '../../utils/Amount';
import type { AmountData, BaseValue, FiatCurrency } from '../../utils/Amount';
import type { MarketsResponse } from '../../Client';
import type { TTLCache } from '../../utils/TTLCache';
import { UnsupportedOperationError } from '../../errors';
import { buildRpcUrl } from '../RpcUrls';
import type {
  Network,
  NetworkInfoInternal,
  UtxoNetworkParams,
  AddressType,
  AddressTypeConfig,
} from './types';

/**
 * Describes a blockchain network supported by ChainGate.
 *
 * Each instance carries the full network metadata and exposes the network
 * identifier via its {@link id} property.
 *
 * @example
 * ```ts
 * const cg = new ChainGate();
 * const btc = cg.networks.bitcoin;
 * console.log(btc.name);   // 'Bitcoin'
 * console.log(btc.symbol); // 'BTC'
 *
 * // Create an Amount for transfers
 * const amount = btc.amount('0.001');
 * ```
 */
export class NetworkDescriptor<TAddressType extends AddressType = AddressType> {
  /** Network identifier used in API calls (e.g. `"bitcoin"`, `"ethereum"`). */
  readonly id: Network;
  readonly name: string;
  readonly symbol: string;
  readonly type: 'evm' | 'utxo';
  readonly decimals: number;
  readonly isTestnet: boolean;
  readonly hasOwnToken: boolean;
  readonly nativeToken: { readonly symbol: string; readonly name: string };
  readonly chainId?: number;
  readonly defaultAddressType: TAddressType;
  readonly addressTypes: Partial<Record<TAddressType, AddressTypeConfig>>;

  /**
   * Full JSON-RPC endpoint URL for this network on the ChainGate RPC proxy.
   * When a ChainGate API key is configured, it is appended automatically.
   *
   * @example
   * ```ts
   * console.log(cg.networks.ethereum.rpcUrl);
   * // → "https://api.chaingate.dev/rpc/ethereum"
   * ```
   */
  readonly rpcUrl: string;

  /** @internal */
  readonly networkParams?: UtxoNetworkParams;

  /** @internal */
  private readonly marketsCache: TTLCache<MarketsResponse>;

  /** @internal */
  constructor(
    id: Network,
    info: NetworkInfoInternal,
    marketsCache: TTLCache<MarketsResponse>,
    apiKey?: string,
  ) {
    this.id = id;
    this.name = info.name;
    this.symbol = info.symbol;
    this.type = info.type;
    this.decimals = info.decimals;
    this.isTestnet = info.isTestnet;
    this.hasOwnToken = info.hasOwnToken;
    this.nativeToken = info.nativeToken;
    this.chainId = info.chainId;
    this.defaultAddressType = info.defaultAddressType as TAddressType;
    this.addressTypes = info.addressTypes as Partial<Record<TAddressType, AddressTypeConfig>>;
    this.networkParams = info.networkParams;
    this.marketsCache = marketsCache;
    this.rpcUrl = buildRpcUrl(id, apiKey);
  }

  /**
   * Derives a blockchain address from a compressed public key.
   *
   * Each network subclass implements the appropriate derivation algorithm:
   * - **UTXO** networks: segwit, legacy, or taproot.
   * - **Bitcoin Cash**: CashAddr or legacy.
   * - **EVM** networks: EIP-55 checksummed address.
   *
   * @param publicKey - Compressed (33-byte) public key.
   * @param addressType - Address encoding to use. Defaults to the network's
   *   {@link defaultAddressType}.
   * @returns The derived address string.
   */
  public publicKeyToAddress(publicKey: Uint8Array, addressType?: TAddressType): string {
    void publicKey;
    void addressType;
    throw new UnsupportedOperationError(
      `publicKeyToAddress is not implemented for network "${this.id}".`,
    );
  }

  /**
   * Checks whether a string is a valid address for this network.
   *
   * Each network subclass implements the appropriate validation:
   * - **UTXO** networks: base58check and bech32/bech32m decoding.
   * - **Bitcoin Cash**: CashAddr and legacy Base58Check formats.
   * - **EVM** networks: hex format and EIP-55 checksum.
   *
   * @param address - The address string to validate.
   * @returns `true` if the address is valid for this network.
   */
  public isValidAddress(address: string): boolean {
    void address;
    throw new UnsupportedOperationError(
      `isValidAddress is not implemented for network "${this.id}".`,
    );
  }

  /**
   * Creates an {@link Amount} in base units of the native coin
   * (e.g. `0.001` for 0.001 BTC, `0.1` for 0.1 ETH).
   *
   * Accepts `number`, `string`, `bigint`, or a {@link DecimalLike} instance
   * (e.g. `decimal.js`) for precision-safe input:
   * - `btc.amount(0.001)` — convenient shorthand.
   * - `btc.amount('0.00000001')` — full decimal precision.
   * - `btc.amount(1n)` — exact integer (1 whole coin).
   * - `btc.amount(new Decimal('0.001'))` — from a `decimal.js` instance.
   *
   * @example
   * ```ts
   * const amount = cg.networks.bitcoin.amount('0.001');
   * const tx = await btc.transfer(amount, 'bc1q...');
   * ```
   */
  public amount(value: BaseValue): Amount {
    return Amount.fromDecimal(value, this.decimals, this.nativeAmountData(), this.marketsCache);
  }

  /**
   * Creates an {@link Amount} from a fiat currency value, converting it to the
   * native coin at the current market rate.
   *
   * @param fiat - Fiat currency symbol, case-insensitive (e.g. `"usd"`, `"EUR"`).
   * @param value - The fiat amount (e.g. `50` for $50). Accepts `number`, `string`, `bigint`, or {@link DecimalLike}.
   *
   * @example
   * ```ts
   * const amount = await cg.networks.ethereum.amountFromCurrency('usd', 50);
   * const tx = await eth.transfer(amount, '0x...');
   * ```
   */
  public async amountFromCurrency(fiat: FiatCurrency, value: BaseValue): Promise<Amount> {
    const normalizedFiat = fiat.toLowerCase();
    const markets = await this.marketsCache.fetch();

    const cryptoEntry = markets.crypto.find((c) => c.id === this.id);
    if (!cryptoEntry) {
      throw new UnsupportedOperationError(`No market data found for network "${this.id}".`);
    }

    const rateUsd = new Decimal(cryptoEntry.nativeToken.rateUsd);

    let valueUsd: Decimal;
    if (normalizedFiat === 'usd') {
      valueUsd = new Decimal(value.toString());
    } else {
      const fiatEntry = markets.fiat.find((f) => f.symbol === normalizedFiat);
      if (!fiatEntry) {
        throw new UnsupportedOperationError(
          `Unsupported fiat currency "${fiat}". Currency not found in market data.`,
        );
      }
      valueUsd = new Decimal(value.toString()).mul(new Decimal(fiatEntry.rateUsd));
    }

    const cryptoBase = valueUsd.div(rateUsd);
    const smallest = BigInt(cryptoBase.mul(new Decimal(10).pow(this.decimals)).toFixed(0));
    return new Amount(smallest, this.decimals, this.nativeAmountData(), this.marketsCache);
  }

  /** Returns the network identifier string. */
  toString(): string {
    return this.id;
  }

  /** @internal */
  private nativeAmountData(): AmountData {
    return {
      symbol: this.nativeToken.symbol,
      name: this.nativeToken.name,
      network: this.id,
    };
  }
}
