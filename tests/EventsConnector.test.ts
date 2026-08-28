/**
 * Connector event methods: the wallet address is derived asynchronously and
 * the subscription is created with it.
 */
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { MockEventsServer, waitFor, sleep } from './events/mockEventsServer';
import { makeGlobal, makeUtxoExplorer, makeEvmExplorer } from './events/helpers';
import { importWallet } from '../src';
import { UtxoConnector } from '../src/Connector/UtxoConnector/UtxoConnector';
import { BchConnector } from '../src/Connector/UtxoConnector/BchConnector/BchConnector';
import { EvmConnector } from '../src/Connector/EvmConnector/EvmConnector';
import { createNetworkCollection } from '../src/ChainGate/networks';
import { MNEMONIC, PRIV_HEX } from './fixtures';

let mock: MockEventsServer;

beforeEach(async () => {
  mock = await MockEventsServer.start();
});

afterEach(async () => {
  await mock.stop();
});

describe('Connector real-time events', () => {
  it('derives the wallet address and subscribes with it', async () => {
    const global = makeGlobal();
    const networks = createNetworkCollection(global.marketsCache);
    const explorer = makeUtxoExplorer(mock.baseUrl, global, 'bitcoin');
    const btc = new UtxoConnector(importWallet({ phrase: MNEMONIC }), explorer, networks.bitcoin);
    const expected = await btc.address();

    const balances: string[] = [];
    const sub = btc.onBalance((event) =>
      balances.push(`${event.address}:${event.confirmed.min()}`),
    );
    expect(sub.address).toBeUndefined();
    await sub.ready;
    expect(sub.address).toBe(expected);
    expect(mock.received('subscribe')).toEqual([
      { action: 'subscribe', channel: 'balance', address: expected },
    ]);

    mock.send({ type: 'balance', address: expected, confirmedSat: '1234' });
    await waitFor(() => balances.length === 1);
    expect(balances[0]).toBe(`${expected}:1234`);

    sub.unsubscribe();
    await waitFor(() => mock.openSockets === 0);
  });

  it('honours address options', async () => {
    const global = makeGlobal();
    const networks = createNetworkCollection(global.marketsCache);
    const btc = new UtxoConnector(
      importWallet({ phrase: MNEMONIC }),
      makeUtxoExplorer(mock.baseUrl, global, 'bitcoin'),
      networks.bitcoin,
    );
    const options = { index: 2, addressType: 'legacy' as const };
    const expected = await btc.address(options);

    const sub = btc.onTransaction(() => {}, options);
    await sub.ready;
    expect(sub.address).toBe(expected);
    expect(mock.received('subscribe')[0]).toEqual({
      action: 'subscribe',
      channel: 'history',
      address: expected,
    });
    sub.unsubscribe();
  });

  it('never subscribes when cancelled while the address is being derived', async () => {
    const global = makeGlobal();
    const networks = createNetworkCollection(global.marketsCache);
    const btc = new UtxoConnector(
      importWallet({ phrase: MNEMONIC }),
      makeUtxoExplorer(mock.baseUrl, global, 'bitcoin'),
      networks.bitcoin,
    );

    const sub = btc.onPendingBalance(() => {});
    sub.unsubscribe();
    await expect(sub.ready).resolves.toBeUndefined();
    await sleep(60);
    expect(mock.connections).toBe(0);
    expect(mock.received()).toEqual([]);
  });

  it('rejects ready when the address cannot be derived', async () => {
    const global = makeGlobal();
    const networks = createNetworkCollection(global.marketsCache);
    const single = new UtxoConnector(
      importWallet({ privateKey: PRIV_HEX }),
      makeUtxoExplorer(mock.baseUrl, global, 'bitcoin'),
      networks.bitcoin,
    );

    const sub = single.onBalance(() => {}, { index: 1 });
    await expect(sub.ready).rejects.toThrow();
    expect(sub.address).toBeUndefined();
    expect(mock.connections).toBe(0);
  });

  it('subscribes EVM addresses in canonical form and keeps the checksummed one', async () => {
    const global = makeGlobal();
    const networks = createNetworkCollection(global.marketsCache);
    const eth = new EvmConnector(
      importWallet({ phrase: MNEMONIC }),
      makeEvmExplorer(mock.baseUrl, global, 'ethereum'),
      networks.ethereum,
    );
    const expected = await eth.address();
    expect(expected).not.toBe(expected.toLowerCase());

    const events: string[] = [];
    const sub = eth.onContractInteraction((event) => events.push(event.address));
    await sub.ready;
    expect(sub.address).toBe(expected);
    expect(mock.received('subscribe')[0]).toEqual({
      action: 'subscribe',
      channel: 'contract_interactions',
      address: expected.toLowerCase(),
    });

    mock.send({
      type: 'contract_interaction',
      data: { address: expected.toLowerCase(), contract: '0xcontract', height: 1 },
    });
    await waitFor(() => events.length === 1);
    expect(events[0]).toBe(expected);
    sub.unsubscribe();
  });

  it('subscribes Bitcoin Cash addresses in CashAddr form', async () => {
    const global = makeGlobal();
    const networks = createNetworkCollection(global.marketsCache);
    const bch = new BchConnector(
      importWallet({ phrase: MNEMONIC }),
      makeUtxoExplorer(mock.baseUrl, global, 'bitcoincash'),
      networks.bitcoincash,
    );
    const expected = await bch.address();
    expect(expected.startsWith('bitcoincash:')).toBe(true);

    const sub = bch.onPendingTransaction(() => {});
    await sub.ready;
    expect(sub.address).toBe(expected);
    expect(mock.received('subscribe')[0]).toEqual({
      action: 'subscribe',
      channel: 'history',
      pending: true,
      address: expected,
    });
    expect(mock.paths[0]).toBe('/utxo/bitcoincash/events');
    sub.unsubscribe();
  });

  it('shares whole-chain subscriptions with the explorer', async () => {
    const global = makeGlobal();
    const networks = createNetworkCollection(global.marketsCache);
    const explorer = makeUtxoExplorer(mock.baseUrl, global, 'bitcoin');
    const btc = new UtxoConnector(importWallet({ phrase: MNEMONIC }), explorer, networks.bitcoin);

    const a = btc.onBlock(() => {});
    const b = explorer.onBlock(() => {});
    const c = btc.onMempoolTransaction(() => {});
    await Promise.all([a.ready, b.ready, c.ready]);
    expect(mock.received('subscribe')).toEqual([
      { action: 'subscribe', channel: 'blocks' },
      { action: 'subscribe', channel: 'mempool' },
    ]);
    expect(mock.connections).toBe(1);

    const errors: Error[] = [];
    const remove = btc.onError((error) => errors.push(error));
    mock.send({ type: 'error', message: 'odd' });
    await waitFor(() => errors.length === 1);
    remove();

    a.unsubscribe();
    b.unsubscribe();
    c.unsubscribe();
  });
});
