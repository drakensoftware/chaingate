import { describe, it, expect } from 'vitest';
import { Amount, UnsupportedOperationError } from '../src';
import type { AmountData } from '../src';
import type { MarketsResponse } from '../src/Client';
import { TTLCache } from '../src/utils/TTLCache';

const MOCK_MARKETS: MarketsResponse = {
  crypto: [
    {
      id: 'bitcoin',
      name: 'Bitcoin',
      symbol: 'BTC',
      hasOwnToken: true,
      nativeToken: {
        symbol: 'BTC',
        name: 'Bitcoin',
        rateUsd: '50000',
        vol24h: '1000000000',
        marketCap: '1000000000000',
      },
    },
    {
      id: 'ethereum',
      name: 'Ethereum',
      symbol: 'ETH',
      hasOwnToken: true,
      nativeToken: {
        symbol: 'ETH',
        name: 'Ether',
        rateUsd: '2500',
        vol24h: '500000000',
        marketCap: '300000000000',
      },
    },
  ],
  fiat: [
    { symbol: 'eur', rateUsd: '0.92' },
    { symbol: 'gbp', rateUsd: '0.79' },
    { symbol: 'jpy', rateUsd: '0.0067' },
  ],
};

/** Creates a TTLCache that resolves with the mock markets data. */
function mockCache(): TTLCache<MarketsResponse> {
  return new TTLCache(() => Promise.resolve(MOCK_MARKETS), 60_000);
}

const btcData: AmountData = {
  symbol: 'BTC',
  name: 'Bitcoin',
  network: 'bitcoin',
};

const ethData: AmountData = {
  symbol: 'ETH',
  name: 'Ether',
  network: 'ethereum',
};

const tokenData: AmountData = {
  symbol: 'USDC',
  name: 'USD Coin',
  network: 'ethereum',
  contractAddress: '0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48',
};

describe('Amount.toCurrency', () => {
  it('converts BTC to USD', async () => {
    // 1 BTC = 100_000_000 satoshis, rateUsd = 50000
    const amount = new Amount(BigInt(100_000_000), 8, btcData, mockCache());
    const usd = await amount.toCurrency('usd');
    expect(usd).toBe(50_000);
  });

  it('converts fractional BTC to USD', async () => {
    // 0.5 BTC = 50_000_000 satoshis
    const amount = new Amount(BigInt(50_000_000), 8, btcData, mockCache());
    const usd = await amount.toCurrency('usd');
    expect(usd).toBe(25_000);
  });

  it('converts ETH to USD', async () => {
    // 1 ETH = 10^18 wei, rateUsd = 2500
    const amount = new Amount(BigInt('1000000000000000000'), 18, ethData, mockCache());
    const usd = await amount.toCurrency('usd');
    expect(usd).toBe(2_500);
  });

  it('converts BTC to EUR', async () => {
    // 1 BTC = 50000 USD, EUR rateUsd = 0.92 → 1 EUR = 0.92 USD → 50000 / 0.92
    const amount = new Amount(BigInt(100_000_000), 8, btcData, mockCache());
    const eur = await amount.toCurrency('eur');
    expect(eur).toBeCloseTo(50_000 / 0.92, 2);
  });

  it('converts BTC to GBP', async () => {
    const amount = new Amount(BigInt(100_000_000), 8, btcData, mockCache());
    const gbp = await amount.toCurrency('gbp');
    expect(gbp).toBeCloseTo(50_000 / 0.79, 2);
  });

  it('is case-insensitive for fiat symbol', async () => {
    const cache = mockCache();
    const amount = new Amount(BigInt(100_000_000), 8, btcData, cache);
    const upper = await amount.toCurrency('EUR');
    const lower = await amount.toCurrency('eur');
    expect(upper).toBe(lower);
  });

  it('returns 0 for zero amount', async () => {
    const amount = new Amount(BigInt(0), 8, btcData, mockCache());
    const usd = await amount.toCurrency('usd');
    expect(usd).toBe(0);
  });

  it('returns null for tokens', async () => {
    const amount = new Amount(BigInt(1_000_000), 6, tokenData, mockCache());
    const result = await amount.toCurrency('usd');
    expect(result).toBeNull();
  });

  it('returns null for unknown network', async () => {
    const unknownData: AmountData = {
      symbol: 'XYZ',
      name: 'Unknown',
      network: 'unknown-chain',
    };
    const amount = new Amount(BigInt(100), 8, unknownData, mockCache());
    const result = await amount.toCurrency('usd');
    expect(result).toBeNull();
  });

  it('throws UnsupportedOperationError for unsupported fiat currency', async () => {
    const amount = new Amount(BigInt(100_000_000), 8, btcData, mockCache());
    await expect(amount.toCurrency('xyz')).rejects.toThrow(UnsupportedOperationError);
    await expect(amount.toCurrency('xyz')).rejects.toThrow('Unsupported fiat currency');
  });

  it('works with Amount.fromDecimal', async () => {
    const amount = Amount.fromDecimal('1.5', 8, btcData, mockCache());
    const usd = await amount.toCurrency('usd');
    expect(usd).toBe(75_000);
  });
});
