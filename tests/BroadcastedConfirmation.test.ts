/**
 * Event-driven confirmation tracking of broadcasted transactions.
 */
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { MockEventsServer, waitFor, sleep } from './events/mockEventsServer';
import {
  makeGlobal,
  makeUtxoExplorer,
  makeEvmExplorer,
  BTC_ADDR,
  EVM_ADDR,
} from './events/helpers';
import { BroadcastedUtxoTransaction } from '../src/Connector/UtxoConnector/BroadcastedUtxoTransaction';
import { BroadcastedEvmTransaction } from '../src/Connector/EvmConnector/BroadcastedEvmTransaction';
import type { UtxoExplorer } from '../src/Explorer/UtxoExplorer';
import type { EvmExplorer } from '../src/Explorer/EvmExplorer';
import type { UtxoConfirmationDetails, EvmConfirmationDetails } from '../src';

type UtxoDetails = Awaited<ReturnType<UtxoExplorer['getTransactionDetails']>>;
type EvmDetails = Awaited<ReturnType<EvmExplorer['getTransactionDetails']>>;

const TXID = '4a5e1e4baab89f3a32518a88c31bc87f618f76673e2cc77ab2127b7afdeda33b';
const HASH = '0x5c504ed432cb51138bcf09aa5e8a410dd4a1e204ef84bfed1be16dfba1b22060';

const utxoPending = { blockHeight: null } as unknown as UtxoDetails;
const utxoConfirmed = (blockHeight: number) => ({ blockHeight }) as unknown as UtxoDetails;
const evmPending = { status: null } as unknown as EvmDetails;
const evmMined = (status: 0 | 1, blockHeight: number) =>
  ({ status, blockHeight }) as unknown as EvmDetails;

let mock: MockEventsServer;

beforeEach(async () => {
  mock = await MockEventsServer.start();
});

afterEach(async () => {
  await mock.stop();
});

describe('BroadcastedUtxoTransaction.onConfirmed', () => {
  it('follows the sender address and confirms from the event without extra lookups', async () => {
    const explorer = makeUtxoExplorer(mock.baseUrl, makeGlobal());
    const lookup = vi.spyOn(explorer, 'getTransactionDetails').mockResolvedValue(utxoPending);
    const cache = vi.spyOn(explorer.global.utxoCache, 'confirmTransaction');
    const tx = new BroadcastedUtxoTransaction(TXID, explorer, [BTC_ADDR]);

    const details: UtxoConfirmationDetails[] = [];
    tx.onConfirmed((d) => details.push(d));

    await waitFor(() => mock.received('subscribe').length === 1);
    expect(mock.received('subscribe')[0]).toEqual({
      action: 'subscribe',
      channel: 'history',
      address: BTC_ADDR,
    });
    // One lookup once the subscription is acknowledged.
    await waitFor(() => lookup.mock.calls.length === 1);

    mock.send({
      type: 'history',
      data: {
        address: BTC_ADDR,
        height: 840002,
        block_n: 17,
        txid: TXID.toUpperCase(),
        add: false,
        amount: '20000',
        addressBalance: '1',
      },
    });
    await waitFor(() => details.length === 1);
    expect(details[0]).toEqual({ transactionId: TXID, blockHeight: 840002 });
    expect(cache).toHaveBeenCalledWith(TXID);
    expect(lookup).toHaveBeenCalledTimes(1);

    // Tracking stops: the only subscription is gone, so the connection closes.
    await waitFor(() => mock.openSockets === 0);

    // Already confirmed — fires right away.
    const late: UtxoConfirmationDetails[] = [];
    tx.onConfirmed((d) => late.push(d));
    await waitFor(() => late.length === 1);
    expect(mock.connections).toBe(1);
  });

  it('confirms from the lookup that runs once the subscription is acknowledged', async () => {
    const explorer = makeUtxoExplorer(mock.baseUrl, makeGlobal());
    vi.spyOn(explorer, 'getTransactionDetails').mockResolvedValue(utxoConfirmed(100));
    const tx = new BroadcastedUtxoTransaction(TXID, explorer, [BTC_ADDR]);

    const details: UtxoConfirmationDetails[] = [];
    tx.onConfirmed((d) => details.push(d));
    await waitFor(() => details.length === 1);
    expect(details[0]).toEqual({ transactionId: TXID, blockHeight: 100 });
  });

  it('ignores events of other transactions', async () => {
    const explorer = makeUtxoExplorer(mock.baseUrl, makeGlobal());
    const lookup = vi.spyOn(explorer, 'getTransactionDetails').mockResolvedValue(utxoPending);
    const tx = new BroadcastedUtxoTransaction(TXID, explorer, [BTC_ADDR]);

    const details: UtxoConfirmationDetails[] = [];
    const cancel = tx.onConfirmed((d) => details.push(d));
    await waitFor(() => lookup.mock.calls.length === 1);

    mock.send({
      type: 'history',
      data: {
        address: BTC_ADDR,
        height: 1,
        block_n: 0,
        txid: 'other',
        add: true,
        amount: '1',
        addressBalance: '1',
      },
    });
    await sleep(40);
    expect(details).toEqual([]);
    expect(lookup).toHaveBeenCalledTimes(1);
    cancel();
  });

  it('stops tracking when every callback is cancelled and starts again on the next one', async () => {
    const explorer = makeUtxoExplorer(mock.baseUrl, makeGlobal());
    vi.spyOn(explorer, 'getTransactionDetails').mockResolvedValue(utxoPending);
    const tx = new BroadcastedUtxoTransaction(TXID, explorer, [BTC_ADDR]);

    const cancelA = tx.onConfirmed(() => {});
    const cancelB = tx.onConfirmed(() => {});
    await waitFor(() => mock.received('subscribe').length === 1);
    cancelA();
    await sleep(30);
    expect(mock.openSockets).toBe(1);
    cancelB();
    await waitFor(() => mock.openSockets === 0);

    const cancelC = tx.onConfirmed(() => {});
    await waitFor(() => mock.connections === 2);
    cancelC();
    cancelC(); // idempotent
    await waitFor(() => mock.openSockets === 0);
  });

  it('falls back to polling when the subscription is refused', async () => {
    mock.autoAck = false;
    const explorer = makeUtxoExplorer(mock.baseUrl, makeGlobal());
    const lookup = vi.spyOn(explorer, 'getTransactionDetails').mockResolvedValue(utxoConfirmed(7));
    const tx = new BroadcastedUtxoTransaction(TXID, explorer, [BTC_ADDR]);

    const details: UtxoConfirmationDetails[] = [];
    tx.onConfirmed((d) => details.push(d));
    await mock.waitForFrames(1);
    expect(lookup).not.toHaveBeenCalled();

    mock.send({ type: 'error', message: 'invalid subscription request' });
    await waitFor(() => details.length === 1);
    expect(details[0]).toEqual({ transactionId: TXID, blockHeight: 7 });
    expect(lookup).toHaveBeenCalledTimes(1);
  });

  it('tracks block by block when the sender addresses are unknown', async () => {
    const explorer = makeUtxoExplorer(mock.baseUrl, makeGlobal());
    const lookup = vi
      .spyOn(explorer, 'getTransactionDetails')
      .mockResolvedValueOnce(utxoPending)
      .mockResolvedValue(utxoConfirmed(840003));
    const tx = new BroadcastedUtxoTransaction(TXID, explorer, null);

    const details: UtxoConfirmationDetails[] = [];
    tx.onConfirmed((d) => details.push(d));
    await waitFor(() => mock.received('subscribe').length === 1);
    expect(mock.received('subscribe')[0]).toEqual({ action: 'subscribe', channel: 'blocks' });
    await waitFor(() => lookup.mock.calls.length === 1);

    mock.send({
      type: 'block',
      data: { height: 840003, hash: 'a', previous_hash: 'b', num_txs: 1 },
    });
    await waitFor(() => details.length === 1);
    expect(details[0].blockHeight).toBe(840003);
    expect(lookup).toHaveBeenCalledTimes(2);
  });

  it('looks the transaction up again after a reconnection', async () => {
    const explorer = makeUtxoExplorer(mock.baseUrl, makeGlobal());
    const lookup = vi.spyOn(explorer, 'getTransactionDetails').mockResolvedValue(utxoPending);
    const tx = new BroadcastedUtxoTransaction(TXID, explorer, [BTC_ADDR]);
    const cancel = tx.onConfirmed(() => {});
    await waitFor(() => lookup.mock.calls.length === 1);

    mock.closeAll(1011, 'upstream closed');
    await waitFor(() => mock.connections === 2);
    await waitFor(() => lookup.mock.calls.length === 2);
    cancel();
  });
});

describe('BroadcastedEvmTransaction.onConfirmed', () => {
  it('looks the transaction up once per block of the sender and reports the status', async () => {
    const explorer = makeEvmExplorer(mock.baseUrl, makeGlobal());
    const lookup = vi
      .spyOn(explorer, 'getTransactionDetails')
      .mockResolvedValueOnce(evmPending)
      .mockResolvedValue(evmMined(1, 19234567));
    const tx = new BroadcastedEvmTransaction(HASH, explorer, EVM_ADDR);

    const details: EvmConfirmationDetails[] = [];
    tx.onConfirmed((d) => details.push(d));
    await waitFor(() => mock.received('subscribe').length === 1);
    expect(mock.received('subscribe')[0]).toEqual({
      action: 'subscribe',
      channel: 'history',
      address: EVM_ADDR.toLowerCase(),
    });
    await waitFor(() => lookup.mock.calls.length === 1);

    const frame = {
      type: 'history',
      data: { address: EVM_ADDR.toLowerCase(), height: 19234567, block_n: 1 },
    };
    mock.send(frame);
    mock.send(frame); // same block again — no extra lookup
    await waitFor(() => details.length === 1);
    expect(details[0]).toEqual({ transactionId: HASH, blockHeight: 19234567, status: 'success' });
    await sleep(30);
    expect(lookup).toHaveBeenCalledTimes(2);
    await waitFor(() => mock.openSockets === 0);
  });

  it('reports reverted transactions', async () => {
    const explorer = makeEvmExplorer(mock.baseUrl, makeGlobal());
    vi.spyOn(explorer, 'getTransactionDetails').mockResolvedValue(evmMined(0, 5));
    const tx = new BroadcastedEvmTransaction(HASH, explorer, EVM_ADDR);

    const details: EvmConfirmationDetails[] = [];
    tx.onConfirmed((d) => details.push(d));
    await waitFor(() => details.length === 1);
    expect(details[0].status).toBe('reverted');
  });

  it('retries a lookup that fails', async () => {
    const explorer = makeEvmExplorer(mock.baseUrl, makeGlobal());
    const lookup = vi
      .spyOn(explorer, 'getTransactionDetails')
      .mockRejectedValueOnce(new Error('temporarily unavailable'))
      .mockResolvedValue(evmMined(1, 9));
    const tx = new BroadcastedEvmTransaction(HASH, explorer, EVM_ADDR);

    const details: EvmConfirmationDetails[] = [];
    const cancel = tx.onConfirmed((d) => details.push(d));
    await waitFor(() => lookup.mock.calls.length === 1);
    // The bounded retry kicks in after a few seconds; a new block also triggers a lookup.
    mock.send({
      type: 'history',
      data: { address: EVM_ADDR.toLowerCase(), height: 9, block_n: 0 },
    });
    await waitFor(() => details.length === 1);
    cancel();
  });
});
