/**
 * Smoke test against the live API. Opt in with `TEST_LIVE_EVENTS=1` — it needs
 * network access and waits for a real block.
 */
import { describe, it, expect } from 'vitest';
import { ChainGate } from '../src';
import { getTestApiKey } from './helpers';

const LIVE = process.env.TEST_LIVE_EVENTS === '1';
const BTC_ADDR = 'bc1qw508d6qejxtdg4y5r3zarvary0c5xw7kv8f3t4';

describe.skipIf(!LIVE)('Real-time events (live API)', () => {
  const cg = new ChainGate({ apiKey: getTestApiKey() || undefined });

  it('acknowledges a balance subscription on Bitcoin', async () => {
    const sub = cg.explore(cg.networks.bitcoin).onBalance(BTC_ADDR, () => {});
    await sub.ready;
    expect(sub.address).toBe(BTC_ADDR);
    sub.unsubscribe();
  }, 20_000);

  it('receives a new block on Avalanche', async () => {
    const heights: number[] = [];
    const sub = cg.explore(cg.networks.avalanche).onBlock((block) => heights.push(block.height));
    await sub.ready;
    const start = Date.now();
    while (heights.length === 0 && Date.now() - start < 30_000) {
      await new Promise((resolve) => setTimeout(resolve, 100));
    }
    sub.unsubscribe();
    expect(heights.length).toBeGreaterThan(0);
    expect(heights[0]).toBeGreaterThan(0);
  }, 40_000);
});
