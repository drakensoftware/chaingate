import Decimal from 'decimal.js';
import { UnsupportedOperationError } from '../errors';
import type { MarketsResponse } from '../Client';
import type { TTLCache } from './TTLCache';

/**
 * Fiat currency symbol supported by the market data API.
 *
 * Includes all ISO 4217 currencies returned by the `/global/markets` endpoint.
 * The union provides IDE autocompletion for known currencies while still
 * accepting any lowercase string via the `(string & {})` escape hatch, so
 * newly-added currencies work without a library update.
 */
export type FiatCurrency =
  | 'aed'
  | 'afn'
  | 'all'
  | 'amd'
  | 'ang'
  | 'aoa'
  | 'ars'
  | 'aud'
  | 'awg'
  | 'azn'
  | 'bam'
  | 'bbd'
  | 'bdt'
  | 'bgn'
  | 'bhd'
  | 'bif'
  | 'bmd'
  | 'bnd'
  | 'bob'
  | 'brl'
  | 'bsd'
  | 'btn'
  | 'bwp'
  | 'byn'
  | 'byr'
  | 'bzd'
  | 'cad'
  | 'cdf'
  | 'chf'
  | 'clf'
  | 'clp'
  | 'cnh'
  | 'cny'
  | 'cop'
  | 'crc'
  | 'cuc'
  | 'cup'
  | 'cve'
  | 'czk'
  | 'djf'
  | 'dkk'
  | 'dop'
  | 'dzd'
  | 'egp'
  | 'ern'
  | 'etb'
  | 'eur'
  | 'fjd'
  | 'fkp'
  | 'gbp'
  | 'gel'
  | 'ggp'
  | 'ghs'
  | 'gip'
  | 'gmd'
  | 'gnf'
  | 'gtq'
  | 'gyd'
  | 'hkd'
  | 'hnl'
  | 'hrk'
  | 'htg'
  | 'huf'
  | 'idr'
  | 'ils'
  | 'imp'
  | 'inr'
  | 'iqd'
  | 'irr'
  | 'isk'
  | 'jep'
  | 'jmd'
  | 'jod'
  | 'jpy'
  | 'kes'
  | 'kgs'
  | 'khr'
  | 'kmf'
  | 'kpw'
  | 'krw'
  | 'kwd'
  | 'kyd'
  | 'kzt'
  | 'lak'
  | 'lbp'
  | 'lkr'
  | 'lrd'
  | 'lsl'
  | 'ltl'
  | 'lvl'
  | 'lyd'
  | 'mad'
  | 'mdl'
  | 'mga'
  | 'mkd'
  | 'mmk'
  | 'mnt'
  | 'mop'
  | 'mru'
  | 'mur'
  | 'mvr'
  | 'mwk'
  | 'mxn'
  | 'myr'
  | 'mzn'
  | 'nad'
  | 'ngn'
  | 'nio'
  | 'nok'
  | 'npr'
  | 'nzd'
  | 'omr'
  | 'pab'
  | 'pen'
  | 'pgk'
  | 'php'
  | 'pkr'
  | 'pln'
  | 'pyg'
  | 'qar'
  | 'ron'
  | 'rsd'
  | 'rub'
  | 'rwf'
  | 'sar'
  | 'sbd'
  | 'scr'
  | 'sdg'
  | 'sek'
  | 'sgd'
  | 'shp'
  | 'sle'
  | 'sll'
  | 'sos'
  | 'srd'
  | 'std'
  | 'stn'
  | 'svc'
  | 'syp'
  | 'szl'
  | 'thb'
  | 'tjs'
  | 'tmt'
  | 'tnd'
  | 'top'
  | 'try'
  | 'ttd'
  | 'twd'
  | 'tzs'
  | 'uah'
  | 'ugx'
  | 'usd'
  | 'uyu'
  | 'uzs'
  | 'ves'
  | 'vnd'
  | 'vuv'
  | 'wst'
  | 'xaf'
  | 'xcd'
  | 'xcg'
  | 'xof'
  | 'xpf'
  | 'yer'
  | 'zar'
  | 'zmk'
  | 'zmw'
  | 'zwl'
  | (string & {});

/**
 * Structural interface for decimal-library instances (e.g. `decimal.js`,
 * `big.js`, `bignumber.js`).
 *
 * Any object whose `toString()` returns a valid numeric string is accepted,
 * but the interface narrows the type so arbitrary objects are not assignable.
 */
export interface DecimalLike {
  /** Returns a numeric string representation (e.g. `"0.00000001"`). */
  toString(): string;

  /** Significand digits. Present on `decimal.js` / `big.js` instances. */
  d: readonly number[];
  /** Exponent. Present on `decimal.js` / `big.js` instances. */
  e: number;
  /** Sign (`1` or `-1`). Present on `decimal.js` / `big.js` instances. */
  s: number;
}

/**
 * Accepted input type for monetary values in base units.
 *
 * - `number` — convenient for simple amounts (`0.001`).
 * - `string` — preserves full decimal precision (`"0.00000001"`).
 * - `bigint` — exact integer representation (`1n` means 1 whole coin).
 * - `DecimalLike` — any `decimal.js` / `big.js` / `bignumber.js` instance.
 *
 * All inputs are converted losslessly via `decimal.js` before being stored
 * as the smallest unit internally (satoshis, wei, etc.).
 */
export type BaseValue = string | number | bigint | DecimalLike;

/** Owned NFT token entry. */
export interface OwnedNft {
  /** NFT token ID. */
  id: string;
  /** Raw tokenURI from the contract. `null` if not implemented. */
  uri?: string | null;
}

/** Data for the asset an Amount represents. */
export interface AmountData {
  /** Token or coin symbol (e.g. `"ETH"`, `"USDC"`). */
  symbol: string;
  /** Token or coin name (e.g. `"Ether"`, `"USD Coin"`). */
  name: string;
  /** Network identifier (e.g. `"ethereum"`, `"bitcoin"`). */
  network: string;
  /** Contract address. Present for tokens/NFTs, `null` for native coins. */
  contractAddress?: string | null;
  /** Owned NFT tokens. Present for ERC-721/1155 balances. */
  ownedTokens?: OwnedNft[] | null;
}

export class Amount {
  private readonly amount: bigint;
  private readonly baseDecimals: number;
  private readonly data: AmountData;
  /** @internal */
  private readonly marketsCache: TTLCache<MarketsResponse>;

  constructor(
    amount: bigint,
    baseDecimals: number,
    data: AmountData,
    marketsCache: TTLCache<MarketsResponse>,
  ) {
    this.amount = amount;
    this.baseDecimals = baseDecimals;
    this.data = data;
    this.marketsCache = marketsCache;
  }

  /**
   * Creates an Amount from a base-unit value (e.g. `0.005` BTC, `"0.00000001"` BTC).
   * Converts the value to the smallest unit (e.g. satoshis, wei) internally.
   *
   * @param value - Amount in base units. Accepts `number`, `string`, or `bigint`.
   */
  public static fromDecimal(
    value: BaseValue,
    baseDecimals: number,
    data: AmountData,
    marketsCache: TTLCache<MarketsResponse>,
  ): Amount {
    const d = new Decimal(value.toString()).mul(new Decimal(10).pow(baseDecimals));
    return new Amount(BigInt(d.toFixed(0)), baseDecimals, data, marketsCache);
  }

  /**
   * Returns the amount in the base unit as a number (e.g. 1.5 BTC, 0.03 ETH).
   */
  public base(): number {
    return new Decimal(this.amount.toString())
      .div(new Decimal(10).pow(this.baseDecimals))
      .toNumber();
  }

  /**
   * Converts this amount to a fiat currency value using live market rates.
   *
   * Returns `null` when this amount represents a token (only native coins are
   * supported) or when the network is not found in the market data.
   *
   * @param fiat - Fiat currency symbol, case-insensitive (e.g. `"usd"`, `"EUR"`, `"gbp"`).
   *               Use `"usd"` to get the USD value directly.
   * @returns The fiat value of this amount, or `null` if the conversion cannot be performed.
   *
   * @throws {UnsupportedOperationError} if the fiat currency is not found in the market data.
   *
   * @example
   * ```ts
   * const cg = new ChainGate();
   * const balance = await cg.explore(cg.networks.bitcoin).getAddressBalance(addr);
   * const eur = await balance.confirmed.toCurrency('eur');
   * if (eur !== null) {
   *   console.log(`${eur} EUR`);
   * }
   * ```
   */
  public async toCurrency(fiat: FiatCurrency): Promise<number | null> {
    if (this.isToken) {
      return null;
    }

    const markets = await this.marketsCache.fetch();
    const normalizedFiat = fiat.toLowerCase();

    // Find the crypto rate (USD) for this network
    const cryptoEntry = markets.crypto.find((c) => c.id === this.data.network);
    if (!cryptoEntry) {
      return null;
    }

    const rateUsd = new Decimal(cryptoEntry.nativeToken.rateUsd);
    const baseValue = new Decimal(this.amount.toString()).div(
      new Decimal(10).pow(this.baseDecimals),
    );
    const valueUsd = baseValue.mul(rateUsd);

    // If requesting USD, return directly
    if (normalizedFiat === 'usd') {
      return valueUsd.toNumber();
    }

    // Find the fiat exchange rate (relative to USD)
    const fiatEntry = markets.fiat.find((f) => f.symbol === normalizedFiat);
    if (!fiatEntry) {
      throw new UnsupportedOperationError(
        `Unsupported fiat currency "${fiat}". Currency not found in market data.`,
      );
    }

    const fiatRateUsd = new Decimal(fiatEntry.rateUsd);
    // fiatRateUsd is "how many USD is 1 unit of this fiat worth"
    // To convert USD → fiat: divide by fiatRateUsd
    return valueUsd.div(fiatRateUsd).toNumber();
  }

  /**
   * Returns the amount in the smallest unit as a bigint (e.g. satoshis, wei).
   */
  public min(): bigint {
    return this.amount;
  }

  /** Token or coin symbol (e.g. `"ETH"`, `"USDC"`). */
  get symbol(): string {
    return this.data.symbol;
  }

  /** Token or coin name (e.g. `"Ether"`, `"USD Coin"`). */
  get name(): string {
    return this.data.name;
  }

  /** Network identifier (e.g. `"ethereum"`, `"bitcoin"`). */
  get network(): string {
    return this.data.network;
  }

  /** Whether this amount represents a token (has a contract address). */
  get isToken(): boolean {
    return this.data.contractAddress != null;
  }

  /** Whether this amount represents an NFT (has owned token data). */
  get isNFT(): boolean {
    return this.data.ownedTokens != null && this.data.ownedTokens.length > 0;
  }

  /**
   * Token contract address. Only available when {@link isToken} is `true`.
   * @throws Error if this is not a token.
   */
  get contractAddress(): string {
    if (this.data.contractAddress == null) {
      throw new UnsupportedOperationError(
        'contractAddress is only available for tokens (isToken === true)',
      );
    }
    return this.data.contractAddress;
  }

  /**
   * Owned NFT tokens. Only available when {@link isNFT} is `true`.
   * @throws Error if this is not an NFT.
   */
  get ownedTokens(): OwnedNft[] {
    if (this.data.ownedTokens == null || this.data.ownedTokens.length === 0) {
      throw new UnsupportedOperationError(
        'ownedTokens is only available for NFTs (isNFT === true)',
      );
    }
    return this.data.ownedTokens;
  }
}
