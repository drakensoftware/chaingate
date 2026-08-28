/**
 * Real-time event client against a local mock server: connection lifecycle,
 * subscription multiplexing, error handling, pacing, watchdog and reconnection.
 */
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { MockEventsServer, waitFor, sleep } from './events/mockEventsServer';
import {
  makeGlobal,
  makeUtxoExplorer,
  makeEvmExplorer,
  BTC_ADDR,
  BTC_ADDR_2,
  BCH_CASHADDR,
  BCH_LEGACY,
  EVM_ADDR,
} from './events/helpers';
import {
  EventStreamError,
  EventSubscriptionError,
  RateLimitError,
  RateLimitQuotaError,
} from '../src';
import type { UtxoBlockEvent } from '../src';

const BLOCK_FRAME = {
  type: 'block',
  data: { height: 840002, hash: 'aa', previous_hash: 'bb', num_txs: 3 },
};

let mock: MockEventsServer;

beforeEach(async () => {
  mock = await MockEventsServer.start();
});

afterEach(async () => {
  await mock.stop();
});

describe('Event stream — connection lifecycle', () => {
  it('opens one connection per network, with the API key, shared by every subscription', async () => {
    const global = makeGlobal();
    const btc = makeUtxoExplorer(mock.baseUrl, global, 'bitcoin', 'secret-key');
    const other = makeUtxoExplorer(mock.baseUrl, global, 'bitcoin', 'secret-key');

    const blocks = btc.onBlock(() => {});
    const balance = other.onBalance(BTC_ADDR, () => {});
    await Promise.all([blocks.ready, balance.ready]);

    expect(mock.connections).toBe(1);
    expect(mock.paths).toEqual(['/utxo/bitcoin/events?api_key=secret-key']);
    expect(mock.received()).toEqual([
      { action: 'subscribe', channel: 'blocks' },
      { action: 'subscribe', channel: 'balance', address: BTC_ADDR },
    ]);
    expect(blocks.address).toBeUndefined();
    expect(balance.address).toBe(BTC_ADDR);
    expect(btc.events.state).toBe('open');

    blocks.unsubscribe();
    balance.unsubscribe();
    await waitFor(() => mock.openSockets === 0);
    // The first cancellation is sent to the server; for the last one closing
    // the connection is enough — no unsubscribe frame is spent on it.
    expect(mock.received('unsubscribe')).toEqual([{ action: 'unsubscribe', channel: 'blocks' }]);
    expect(btc.events.state).toBe('idle');
  });

  it('connects without a query string when keyless, one connection per network', async () => {
    const global = makeGlobal();
    const btc = makeUtxoExplorer(mock.baseUrl, global, 'bitcoin');
    const eth = makeEvmExplorer(mock.baseUrl, global, 'ethereum');

    const a = btc.onBlock(() => {});
    const b = eth.onBlock(() => {});
    await Promise.all([a.ready, b.ready]);

    expect(mock.connections).toBe(2);
    expect([...mock.paths].sort()).toEqual(['/evm/ethereum/events', '/utxo/bitcoin/events']);

    a.unsubscribe();
    b.unsubscribe();
    await waitFor(() => mock.openSockets === 0);
  });

  it('keeps separate connections for separate ChainGate instances', async () => {
    const one = makeUtxoExplorer(mock.baseUrl, makeGlobal());
    const two = makeUtxoExplorer(mock.baseUrl, makeGlobal());

    const a = one.onBlock(() => {});
    const b = two.onBlock(() => {});
    await Promise.all([a.ready, b.ready]);
    expect(mock.connections).toBe(2);

    a.unsubscribe();
    b.unsubscribe();
    await waitFor(() => mock.openSockets === 0);
  });

  it('reuses the stream after every subscription was removed', async () => {
    const btc = makeUtxoExplorer(mock.baseUrl, makeGlobal());

    const a = btc.onBlock(() => {});
    await a.ready;
    a.unsubscribe();
    await waitFor(() => mock.openSockets === 0);

    const b = btc.onBlock(() => {});
    await b.ready;
    expect(mock.connections).toBe(2);
    expect(mock.received('subscribe')).toHaveLength(2);

    b.unsubscribe();
    await waitFor(() => mock.openSockets === 0);
  });

  it('never sends a subscription that was cancelled before the connection opened', async () => {
    const btc = makeUtxoExplorer(mock.baseUrl, makeGlobal());

    const sub = btc.onBlock(() => {});
    sub.unsubscribe();
    await expect(sub.ready).resolves.toBeUndefined();

    await sleep(60);
    expect(mock.received()).toEqual([]);
    expect(mock.openSockets).toBe(0);
    expect(btc.events.state).toBe('idle');
  });
});

describe('Event stream — subscriptions', () => {
  it('sends one subscribe per distinct subscription and unsubscribes when the last listener leaves', async () => {
    const btc = makeUtxoExplorer(mock.baseUrl, makeGlobal());

    const first = btc.onBalance(BTC_ADDR, () => {});
    const second = btc.onBalance(BTC_ADDR, () => {});
    const blocks = btc.onBlock(() => {});
    await Promise.all([first.ready, second.ready, blocks.ready]);
    expect(mock.received('subscribe')).toHaveLength(2);

    first.unsubscribe();
    await sleep(40);
    expect(mock.received('unsubscribe')).toEqual([]);

    second.unsubscribe();
    await waitFor(() => mock.received('unsubscribe').length === 1);
    expect(mock.received('unsubscribe')[0]).toEqual({
      action: 'unsubscribe',
      channel: 'balance',
      address: BTC_ADDR,
    });
    expect(mock.openSockets).toBe(1);

    blocks.unsubscribe();
    await waitFor(() => mock.openSockets === 0);
  });

  it('resolves ready right away for a listener added to an acknowledged subscription', async () => {
    const btc = makeUtxoExplorer(mock.baseUrl, makeGlobal());
    const a = btc.onBlock(() => {});
    await a.ready;

    const b = btc.onBlock(() => {});
    const outcome = await Promise.race([
      b.ready.then(() => 'ready'),
      sleep(30).then(() => 'pending'),
    ]);
    expect(outcome).toBe('ready');
    expect(mock.received('subscribe')).toHaveLength(1);

    a.unsubscribe();
    b.unsubscribe();
  });

  it('distinguishes block summaries from full blocks', async () => {
    const btc = makeUtxoExplorer(mock.baseUrl, makeGlobal());
    const summaries: number[] = [];
    const full: number[] = [];
    const a = btc.onBlock((block) => summaries.push(block.height));
    const b = btc.onFullBlock((block) => full.push(block.transactions.length));
    await Promise.all([a.ready, b.ready]);
    expect(mock.received('subscribe')).toEqual([
      { action: 'subscribe', channel: 'blocks' },
      { action: 'subscribe', channel: 'blocks', full: true },
    ]);

    mock.send(BLOCK_FRAME);
    mock.send({
      type: 'block_full',
      data: { height: 840002, hash: 'aa', previous_hash: 'bb', num_txs: 0, tx: [] },
    });
    await waitFor(() => summaries.length === 1 && full.length === 1);
    expect(summaries).toEqual([840002]);
    expect(full).toEqual([0]);

    a.unsubscribe();
    b.unsubscribe();
  });

  it('delivers events with the address as passed while the wire uses the canonical form', async () => {
    const eth = makeEvmExplorer(mock.baseUrl, makeGlobal());
    const events: Array<{ address: string; height: number; wei: bigint }> = [];
    const sub = eth.onBalance(EVM_ADDR, (event) =>
      events.push({ address: event.address, height: event.height, wei: event.confirmed.min() }),
    );
    await sub.ready;
    expect(mock.received('subscribe')[0]).toEqual({
      action: 'subscribe',
      channel: 'balance',
      address: EVM_ADDR.toLowerCase(),
    });

    mock.send({
      type: 'balance',
      address: EVM_ADDR.toLowerCase(),
      confirmedWei: '1000000000000000000',
      height: 42,
    });
    await waitFor(() => events.length === 1);
    expect(events[0]).toEqual({ address: EVM_ADDR, height: 42, wei: 10n ** 18n });
    expect(sub.address).toBe(EVM_ADDR);

    sub.unsubscribe();
  });

  it('treats the same address written differently as a single subscription', async () => {
    const global = makeGlobal();
    const eth = makeEvmExplorer(mock.baseUrl, global);
    const a = eth.onBalance(EVM_ADDR, () => {});
    const b = eth.onBalance(EVM_ADDR.toLowerCase(), () => {});
    await Promise.all([a.ready, b.ready]);
    expect(mock.received('subscribe')).toHaveLength(1);

    const bch = makeUtxoExplorer(mock.baseUrl, global, 'bitcoincash');
    const c = bch.onBalance(BCH_CASHADDR, () => {});
    const d = bch.onBalance(BCH_LEGACY, () => {});
    const e = bch.onBalance(BCH_CASHADDR.replace('bitcoincash:', ''), () => {});
    await Promise.all([c.ready, d.ready, e.ready]);
    const bchSubscribes = mock
      .received('subscribe')
      .filter((f) => f.channel === 'balance' && f.address === BCH_CASHADDR);
    expect(bchSubscribes).toHaveLength(1);
    expect(mock.received('subscribe')).toHaveLength(2);
    expect(d.address).toBe(BCH_LEGACY);

    for (const sub of [a, b, c, d, e]) sub.unsubscribe();
  });

  it('rejects an invalid address synchronously without opening a connection', () => {
    const global = makeGlobal();
    const btc = makeUtxoExplorer(mock.baseUrl, global, 'bitcoin');
    const eth = makeEvmExplorer(mock.baseUrl, global, 'ethereum');
    expect(() => btc.onBalance('not-an-address', () => {})).toThrow(EventSubscriptionError);
    expect(() => btc.onTransaction(EVM_ADDR, () => {})).toThrow(EventSubscriptionError);
    expect(() => eth.onBalance('0x1234', () => {})).toThrow(EventSubscriptionError);
    expect(() => eth.onContractInteraction(BTC_ADDR, () => {})).toThrow(EventSubscriptionError);
    expect(mock.connections).toBe(0);
    expect(btc.events.state).toBe('idle');
  });

  it('unsubscribes after the pending ack when a subscription is cancelled in flight', async () => {
    mock.autoAck = false;
    const btc = makeUtxoExplorer(mock.baseUrl, makeGlobal());
    const blocks = btc.onBlock(() => {});
    const balance = btc.onBalance(BTC_ADDR, () => {});
    await mock.waitForFrames(2);

    balance.unsubscribe();
    await expect(balance.ready).resolves.toBeUndefined();
    await sleep(40);
    expect(mock.received('unsubscribe')).toEqual([]);

    mock.send({ type: 'subscribed', channel: 'blocks' });
    mock.send({ type: 'subscribed', channel: 'balance', address: BTC_ADDR });
    await blocks.ready;
    await waitFor(() => mock.received('unsubscribe').length === 1);
    expect(mock.received('unsubscribe')[0]).toEqual({
      action: 'unsubscribe',
      channel: 'balance',
      address: BTC_ADDR,
    });

    blocks.unsubscribe();
  });

  it('re-subscribes when a listener returns while an unsubscribe is in flight', async () => {
    mock.autoAck = false;
    const btc = makeUtxoExplorer(mock.baseUrl, makeGlobal());
    const blocks = btc.onBlock(() => {});
    const balance = btc.onBalance(BTC_ADDR, () => {});
    await mock.waitForFrames(2);
    mock.send({ type: 'subscribed', channel: 'blocks' });
    mock.send({ type: 'subscribed', channel: 'balance', address: BTC_ADDR });
    await Promise.all([blocks.ready, balance.ready]);

    balance.unsubscribe();
    await waitFor(() => mock.received('unsubscribe').length === 1);

    const again = btc.onBalance(BTC_ADDR, () => {});
    await sleep(40);
    expect(mock.received('subscribe')).toHaveLength(2); // nothing new while the unsubscribe is pending

    mock.send({ type: 'unsubscribed', channel: 'balance', address: BTC_ADDR });
    await waitFor(() => mock.received('subscribe').length === 3);
    mock.send({ type: 'subscribed', channel: 'balance', address: BTC_ADDR });
    await again.ready;

    again.unsubscribe();
    blocks.unsubscribe();
  });
});

describe('Event stream — errors', () => {
  it('rejects ready when the server refuses a subscription and keeps the others', async () => {
    mock.autoAck = false;
    const btc = makeUtxoExplorer(mock.baseUrl, makeGlobal());
    const errors: Error[] = [];
    btc.onError((error) => errors.push(error));

    const blocks = btc.onBlock(() => {});
    const balance = btc.onBalance(BTC_ADDR, () => {});
    await mock.waitForFrames(2);

    mock.send({ type: 'error', message: 'invalid address' });
    await expect(balance.ready).rejects.toBeInstanceOf(EventSubscriptionError);
    mock.send({ type: 'subscribed', channel: 'blocks' });
    await blocks.ready;

    expect(errors).toHaveLength(1);
    expect(errors[0]).toBeInstanceOf(EventSubscriptionError);
    expect(errors[0].message).toBe('invalid address');
    expect(mock.openSockets).toBe(1);

    // A refused subscription is not retried after a reconnection.
    mock.autoAck = true;
    mock.closeAll(1011, 'upstream closed');
    await waitFor(() => mock.connections === 2);
    await waitFor(() => mock.frames.some((f) => f.connection === 2));
    await sleep(40);
    expect(mock.frames.filter((f) => f.connection === 2).map((f) => f.frame)).toEqual([
      { action: 'subscribe', channel: 'blocks' },
    ]);

    blocks.unsubscribe();
  });

  it('attributes an upstream error to the oldest pending request', async () => {
    mock.autoAck = false;
    const btc = makeUtxoExplorer(mock.baseUrl, makeGlobal());
    const first = btc.onBalance(BTC_ADDR, () => {});
    const second = btc.onBalance(BTC_ADDR_2, () => {});
    await mock.waitForFrames(2);

    mock.send({ type: 'error', message: 'invalid subscription request' });
    await expect(first.ready).rejects.toBeInstanceOf(EventSubscriptionError);

    mock.send({ type: 'subscribed', channel: 'balance', address: BTC_ADDR_2 });
    await expect(second.ready).resolves.toBeUndefined();

    second.unsubscribe();
  });

  it('attributes a gateway validation error to the latest matching request', async () => {
    mock.autoAck = false;
    const btc = makeUtxoExplorer(mock.baseUrl, makeGlobal());
    const balance = btc.onBalance(BTC_ADDR, () => {});
    const blocks = btc.onBlock(() => {});
    await mock.waitForFrames(2);

    // Only the balance request carries an address, so it is the one refused.
    mock.send({ type: 'error', message: 'invalid address' });
    await expect(balance.ready).rejects.toBeInstanceOf(EventSubscriptionError);
    mock.send({ type: 'subscribed', channel: 'blocks' });
    await expect(blocks.ready).resolves.toBeUndefined();

    blocks.unsubscribe();
  });

  it('reports an error frame with nothing pending through onError only', async () => {
    const btc = makeUtxoExplorer(mock.baseUrl, makeGlobal());
    const errors: Error[] = [];
    const heights: number[] = [];
    btc.onError((error) => errors.push(error));
    const sub = btc.onBlock((block) => heights.push(block.height));
    await sub.ready;

    mock.send({ type: 'error', message: 'something odd' });
    await waitFor(() => errors.length === 1);
    expect(errors[0]).toBeInstanceOf(EventStreamError);
    expect(errors[0].message).toBe('something odd');

    mock.send(BLOCK_FRAME);
    await waitFor(() => heights.length === 1);

    sub.unsubscribe();
  });

  it('keeps delivering when a callback throws, and reports the error', async () => {
    const btc = makeUtxoExplorer(mock.baseUrl, makeGlobal());
    const errors: Error[] = [];
    const heights: number[] = [];
    btc.onError((error) => errors.push(error));
    const bad = btc.onBlock(() => {
      throw new Error('boom');
    });
    const good = btc.onBlock((block) => heights.push(block.height));
    await Promise.all([bad.ready, good.ready]);

    mock.send(BLOCK_FRAME);
    await waitFor(() => heights.length === 1);
    expect(errors.map((e) => e.message)).toEqual(['boom']);

    bad.unsubscribe();
    good.unsubscribe();
  });

  it('ignores malformed frames and reports events it cannot map', async () => {
    const btc = makeUtxoExplorer(mock.baseUrl, makeGlobal());
    const errors: Error[] = [];
    const blocks: UtxoBlockEvent[] = [];
    btc.onError((error) => errors.push(error));
    const sub = btc.onBlock((block) => blocks.push(block));
    await sub.ready;

    mock.sendRaw('not json');
    mock.send({});
    mock.send({ type: 'mystery' });
    mock.send({ type: 'block', data: { height: 'nope' } });
    await waitFor(() => errors.length === 1);
    expect(errors[0].message).toMatch(/block\.height/);

    mock.send(BLOCK_FRAME);
    await waitFor(() => blocks.length === 1);
    expect(mock.openSockets).toBe(1);

    sub.unsubscribe();
  });

  it('removes an error listener with the returned function', async () => {
    const btc = makeUtxoExplorer(mock.baseUrl, makeGlobal());
    const errors: Error[] = [];
    const remove = btc.onError((error) => errors.push(error));
    const sub = btc.onBlock(() => {});
    await sub.ready;
    remove();
    mock.send({ type: 'error', message: 'ignored' });
    await sleep(40);
    expect(errors).toEqual([]);
    sub.unsubscribe();
  });
});

describe('Event stream — reconnection', () => {
  it('reconnects with backoff and re-subscribes only the active subscriptions', async () => {
    const btc = makeUtxoExplorer(mock.baseUrl, makeGlobal());
    const errors: Error[] = [];
    const heights: number[] = [];
    btc.onError((error) => errors.push(error));

    const blocks = btc.onBlock((block) => heights.push(block.height));
    const balance = btc.onBalance(BTC_ADDR, () => {});
    await Promise.all([blocks.ready, balance.ready]);
    balance.unsubscribe();
    await waitFor(() => mock.received('unsubscribe').length === 1);

    mock.closeAll(1011, 'upstream closed');
    await waitFor(() => mock.connections === 2);
    await waitFor(() => mock.frames.some((f) => f.connection === 2));
    await sleep(40);
    expect(mock.frames.filter((f) => f.connection === 2).map((f) => f.frame)).toEqual([
      { action: 'subscribe', channel: 'blocks' },
    ]);
    expect(errors).toHaveLength(1);
    expect(errors[0]).toBeInstanceOf(EventStreamError);
    expect((errors[0] as EventStreamError).code).toBe(1011);

    mock.send(BLOCK_FRAME);
    await waitFor(() => heights.length === 1);
    expect(btc.events.state).toBe('open');

    blocks.unsubscribe();
    await waitFor(() => mock.openSockets === 0);
  });

  it('resolves ready after the reconnection for a subscription made while offline', async () => {
    const btc = makeUtxoExplorer(mock.baseUrl, makeGlobal());
    const blocks = btc.onBlock(() => {});
    await blocks.ready;

    mock.autoAck = false;
    mock.closeAll(1011, 'upstream closed');
    await waitFor(() => btc.events.state === 'reconnecting');
    const balance = btc.onBalance(BTC_ADDR, () => {});

    await waitFor(() => mock.connections === 2);
    await waitFor(() => mock.frames.filter((f) => f.connection === 2).length === 2);
    mock.send({ type: 'subscribed', channel: 'blocks' });
    mock.send({ type: 'subscribed', channel: 'balance', address: BTC_ADDR });
    await expect(balance.ready).resolves.toBeUndefined();

    blocks.unsubscribe();
    balance.unsubscribe();
  });

  it('gives up reconnecting once every listener is gone', async () => {
    const btc = makeUtxoExplorer(mock.baseUrl, makeGlobal());
    const sub = btc.onBlock(() => {});
    await sub.ready;

    mock.closeAll(1011, 'upstream closed');
    await waitFor(() => btc.events.state === 'reconnecting');
    sub.unsubscribe();
    expect(btc.events.state).toBe('idle');

    await sleep(120);
    expect(mock.connections).toBe(1);
  });

  it('maps rate-limit closures to the rate-limit errors', async () => {
    const keyless = makeUtxoExplorer(mock.baseUrl, makeGlobal(), 'bitcoin');
    const keyed = makeUtxoExplorer(mock.baseUrl, makeGlobal(), 'litecoin', 'key');
    const errors: Error[] = [];
    keyless.onError((error) => errors.push(error));
    keyed.onError((error) => errors.push(error));

    const a = keyless.onBlock(() => {});
    const b = keyed.onBlock(() => {});
    await Promise.all([a.ready, b.ready]);

    mock.closeAll(
      1008,
      'You have reached the usage limit for requests without an API key. Please obtain a free API key',
    );
    await waitFor(() => errors.length === 2);
    expect(errors.some((e) => e instanceof RateLimitError)).toBe(true);
    expect(errors.some((e) => e instanceof RateLimitQuotaError)).toBe(true);
    expect(keyless.events.state).toBe('reconnecting');

    a.unsubscribe();
    b.unsubscribe();
    expect(keyless.events.state).toBe('idle');
  });

  it('stops after Unauthorized and tries again on the next subscription', async () => {
    mock.autoAck = false;
    const btc = makeUtxoExplorer(mock.baseUrl, makeGlobal(), 'bitcoin', 'bad-key');
    const errors: Error[] = [];
    btc.onError((error) => errors.push(error));

    const first = btc.onBlock(() => {});
    await mock.waitForFrames(1);
    mock.closeAll(1008, 'Unauthorized');
    await expect(first.ready).rejects.toBeInstanceOf(EventStreamError);
    expect(btc.events.state).toBe('failed');
    expect(errors).toHaveLength(1);

    await sleep(80);
    expect(mock.connections).toBe(1);

    const second = btc.onBlock(() => {});
    await waitFor(() => mock.connections === 2);
    await waitFor(() => mock.frames.filter((f) => f.connection === 2).length === 1);
    mock.send({ type: 'subscribed', channel: 'blocks' });
    await second.ready;

    first.unsubscribe();
    second.unsubscribe();
  });

  it('keeps retrying while the upgrade is rejected and stops when unsubscribed', async () => {
    mock.rejectUpgrades = true;
    const btc = makeUtxoExplorer(mock.baseUrl, makeGlobal());
    const errors: Error[] = [];
    btc.onError((error) => errors.push(error));

    const sub = btc.onBlock(() => {});
    await waitFor(() => mock.paths.length >= 3, 5_000);
    expect(errors.length).toBeGreaterThan(0);
    expect(errors[0]).toBeInstanceOf(EventStreamError);

    sub.unsubscribe();
    const attempts = mock.paths.length;
    await sleep(120);
    expect(mock.paths.length).toBe(attempts);
  });

  it('forces a reconnection when an acknowledgement never arrives', async () => {
    mock.autoAck = false;
    const btc = makeUtxoExplorer(mock.baseUrl, makeGlobal({ ackTimeoutMs: 80 }));
    const sub = btc.onBlock(() => {});
    await mock.waitForFrames(1);

    await waitFor(() => mock.connections === 2, 2_000);
    await waitFor(() => mock.frames.filter((f) => f.connection === 2).length === 1);
    mock.send({ type: 'subscribed', channel: 'blocks' });
    await sub.ready;

    sub.unsubscribe();
  });

  it('pings after a silent period and reconnects when no pong arrives', async () => {
    mock.autoPong = false;
    const btc = makeUtxoExplorer(
      mock.baseUrl,
      makeGlobal({ watchdog: { silenceMs: 60, pongTimeoutMs: 60 } }),
    );
    const sub = btc.onBlock(() => {});
    await sub.ready;

    await waitFor(() => mock.received('ping').length >= 1);
    await waitFor(() => mock.connections === 2, 2_000);

    sub.unsubscribe();
  });

  it('keeps the connection when pings are answered', async () => {
    const btc = makeUtxoExplorer(
      mock.baseUrl,
      makeGlobal({ watchdog: { silenceMs: 40, pongTimeoutMs: 200 } }),
    );
    const sub = btc.onBlock(() => {});
    await sub.ready;

    await waitFor(() => mock.received('ping').length >= 2);
    expect(mock.connections).toBe(1);

    sub.unsubscribe();
  });

  it('paces outbound frames', async () => {
    const btc = makeUtxoExplorer(
      mock.baseUrl,
      makeGlobal({ pacing: { capacity: 2, refillMs: 150 } }),
    );
    const subs = [
      btc.onBlock(() => {}),
      btc.onFullBlock(() => {}),
      btc.onMempoolTransaction(() => {}),
      btc.onBalance(BTC_ADDR, () => {}),
    ];

    await mock.waitForFrames(2);
    await sleep(60);
    expect(mock.frames).toHaveLength(2);
    await waitFor(() => mock.frames.length >= 3, 1_000);
    await sleep(60);
    expect(mock.frames).toHaveLength(3);
    await waitFor(() => mock.frames.length === 4, 1_000);
    await Promise.all(subs.map((s) => s.ready));

    for (const sub of subs) sub.unsubscribe();
  });
});
