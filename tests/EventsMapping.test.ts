/**
 * Every event frame the server can send, mapped to its SDK type — camelCase
 * fields and `Amount` instances in the smallest unit.
 */
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { MockEventsServer, waitFor } from './events/mockEventsServer';
import {
  makeGlobal,
  makeUtxoExplorer,
  makeEvmExplorer,
  BTC_ADDR,
  EVM_ADDR,
} from './events/helpers';
import type { Subscription } from '../src';

let mock: MockEventsServer;

beforeEach(async () => {
  mock = await MockEventsServer.start();
});

afterEach(async () => {
  await mock.stop();
});

/** Subscribes, pushes one frame and returns the mapped event. */
async function roundTrip<T>(
  subscribe: (cb: (event: T) => void) => Subscription,
  frame: unknown,
): Promise<T> {
  const events: T[] = [];
  const sub = subscribe((event) => events.push(event));
  await sub.ready;
  mock.send(frame as Record<string, unknown>);
  await waitFor(() => events.length === 1);
  sub.unsubscribe();
  return events[0];
}

describe('UTXO event mapping', () => {
  it('maps block summaries', async () => {
    const btc = makeUtxoExplorer(mock.baseUrl, makeGlobal());
    const block = await roundTrip((cb) => btc.onBlock(cb), {
      type: 'block',
      data: { height: 840002, hash: '0000abc', previous_hash: '0000def', num_txs: 2841 },
    });
    expect(block).toEqual({
      height: 840002,
      hash: '0000abc',
      previousHash: '0000def',
      numTxs: 2841,
    });
  });

  it('maps full blocks with resolved inputs and Amount values', async () => {
    const btc = makeUtxoExplorer(mock.baseUrl, makeGlobal());
    const block = await roundTrip((cb) => btc.onFullBlock(cb), {
      type: 'block_full',
      data: {
        height: 840002,
        hash: '0000abc',
        previous_hash: '0000def',
        num_txs: 2,
        tx: [
          {
            block_n: 0,
            txid: 'e3b0c4',
            vin: [{ txid: 'e3b0c4', n: 0, prev_txid: '0000', prev_n: 0, prev_out: null }],
            vout: [{ txid: 'e3b0c4', n: 0, amount: '625000000' }],
          },
          {
            block_n: 1,
            txid: '4a5e1e',
            vin: [
              {
                txid: '4a5e1e',
                n: 0,
                prev_txid: '1f3c2b',
                prev_n: 2,
                prev_out: { txid: '1f3c2b', n: 2, amount: '70000' },
              },
            ],
            vout: [
              { txid: '4a5e1e', n: 0, amount: '50000' },
              { txid: '4a5e1e', n: 1, amount: '19000' },
            ],
          },
        ],
      },
    });
    expect(block.height).toBe(840002);
    expect(block.numTxs).toBe(2);
    expect(block.transactions).toHaveLength(2);
    const coinbase = block.transactions[0];
    expect(coinbase.blockIndex).toBe(0);
    expect(coinbase.inputs[0].prevOut).toBeNull();
    expect(coinbase.outputs[0].amount.min()).toBe(625000000n);
    expect(coinbase.outputs[0].amount.symbol).toBe('BTC');
    const spend = block.transactions[1];
    expect(spend.inputs[0]).toMatchObject({ txid: '4a5e1e', n: 0, prevTxid: '1f3c2b', prevN: 2 });
    expect(spend.inputs[0].prevOut?.amount.min()).toBe(70000n);
    expect(spend.outputs.map((o) => o.amount.min())).toEqual([50000n, 19000n]);
  });

  it('maps confirmed balances', async () => {
    const btc = makeUtxoExplorer(mock.baseUrl, makeGlobal());
    const event = await roundTrip((cb) => btc.onBalance(BTC_ADDR, cb), {
      type: 'balance',
      address: BTC_ADDR,
      confirmedSat: '12395678',
    });
    expect(event.address).toBe(BTC_ADDR);
    expect(event.confirmed.min()).toBe(12395678n);
    expect(event.confirmed.base()).toBeCloseTo(0.12395678, 8);
    expect(event.confirmed.symbol).toBe('BTC');
  });

  it('maps pending balance deltas, including negative ones', async () => {
    const btc = makeUtxoExplorer(mock.baseUrl, makeGlobal());
    const event = await roundTrip((cb) => btc.onPendingBalance(BTC_ADDR, cb), {
      type: 'pending_balance',
      address: BTC_ADDR,
      pendingSat: '-50000',
    });
    expect(event.address).toBe(BTC_ADDR);
    expect(event.pending.min()).toBe(-50000n);
    expect(event.pending.base()).toBeCloseTo(-0.0005, 8);
  });

  it('maps confirmed transactions', async () => {
    const btc = makeUtxoExplorer(mock.baseUrl, makeGlobal());
    const event = await roundTrip((cb) => btc.onTransaction(BTC_ADDR, cb), {
      type: 'history',
      data: {
        address: BTC_ADDR,
        height: 840002,
        block_n: 17,
        txid: '4a5e1e',
        add: false,
        amount: '20000',
        addressBalance: '12395678',
      },
    });
    expect(event).toMatchObject({
      address: BTC_ADDR,
      txid: '4a5e1e',
      height: 840002,
      blockIndex: 17,
      received: false,
    });
    expect(event.amount.min()).toBe(20000n);
    expect(event.addressBalance.min()).toBe(12395678n);
  });

  it('maps pending transactions of an address', async () => {
    const btc = makeUtxoExplorer(mock.baseUrl, makeGlobal());
    const event = await roundTrip((cb) => btc.onPendingTransaction(BTC_ADDR, cb), {
      type: 'pending',
      address: BTC_ADDR,
      data: {
        txid: '4a5e1e',
        seen_at: 1740391012,
        vsize: 141,
        fee: null,
        feerate: null,
        vin: [{ prev_txid: '1f3c2b', prev_n: 2 }],
        vout: [{ n: 0, amount: '50000' }],
      },
    });
    expect(event).toMatchObject({
      address: BTC_ADDR,
      txid: '4a5e1e',
      seenAt: 1740391012,
      vsize: 141,
      fee: null,
      feeRate: null,
    });
    expect(event.inputs).toEqual([{ prevTxid: '1f3c2b', prevN: 2 }]);
    expect(event.outputs[0].amount.min()).toBe(50000n);
  });

  it('maps mempool transactions', async () => {
    const btc = makeUtxoExplorer(mock.baseUrl, makeGlobal());
    const event = await roundTrip((cb) => btc.onMempoolTransaction(cb), {
      type: 'mempool',
      data: {
        txid: 'aa',
        seen_at: 1740391012,
        vsize: 140,
        fee: '1000',
        feerate: 7.1,
        vin: [{ prev_txid: 'bb', prev_n: 2, prev_amount: '70000' }],
        vout: [
          { n: 0, amount: '50000' },
          { n: 1, amount: '19000' },
        ],
      },
    });
    expect(event.txid).toBe('aa');
    expect(event.fee?.min()).toBe(1000n);
    expect(event.feeRate).toBe(7.1);
    expect(event.inputs[0].prevAmount?.min()).toBe(70000n);
    expect(event.outputs.map((o) => [o.n, o.amount.min()])).toEqual([
      [0, 50000n],
      [1, 19000n],
    ]);
    expect(mock.received('subscribe')[0]).toEqual({ action: 'subscribe', channel: 'mempool' });
  });
});

describe('EVM event mapping', () => {
  const LOWER = EVM_ADDR.toLowerCase();

  it('maps block summaries with their timestamp', async () => {
    const eth = makeEvmExplorer(mock.baseUrl, makeGlobal());
    const block = await roundTrip((cb) => eth.onBlock(cb), {
      type: 'block',
      data: {
        height: 19234567,
        hash: '0xabc',
        previous_hash: '0xdef',
        timestamp: 1740391012,
        num_txs: 187,
      },
    });
    expect(block).toEqual({
      height: 19234567,
      hash: '0xabc',
      previousHash: '0xdef',
      timestamp: 1740391012,
      numTxs: 187,
    });
  });

  it('passes full blocks through untouched', async () => {
    const eth = makeEvmExplorer(mock.baseUrl, makeGlobal());
    const raw = {
      number: '0x12851b7',
      hash: '0xabc',
      parentHash: '0xdef',
      timestamp: '0x65d8e3a4',
      gasLimit: '0x1c9c380',
      gasUsed: '0x1234567',
      miner: '0xminer',
      transactions: [
        {
          hash: '0xtx',
          from: '0xa',
          to: '0xb',
          value: '0x0',
          input: '0x',
          blockNumber: '0x12851b7',
          transactionIndex: '0x0',
        },
      ],
      extraField: 'kept',
    };
    const block = await roundTrip((cb) => eth.onFullBlock(cb), { type: 'block_full', data: raw });
    expect(block).toEqual(raw);
    expect(mock.received('subscribe')[0]).toEqual({
      action: 'subscribe',
      channel: 'blocks',
      full: true,
    });
  });

  it('maps confirmed balances beyond the safe integer range exactly', async () => {
    const eth = makeEvmExplorer(mock.baseUrl, makeGlobal());
    const event = await roundTrip((cb) => eth.onBalance(EVM_ADDR, cb), {
      type: 'balance',
      address: LOWER,
      confirmedWei: '12395678000000000000',
      height: 19234567,
    });
    expect(event.address).toBe(EVM_ADDR);
    expect(event.height).toBe(19234567);
    expect(event.confirmed.min()).toBe(12395678000000000000n);
    expect(event.confirmed.symbol).toBe('ETH');
  });

  it('maps pending balance deltas', async () => {
    const eth = makeEvmExplorer(mock.baseUrl, makeGlobal());
    const event = await roundTrip((cb) => eth.onPendingBalance(EVM_ADDR, cb), {
      type: 'pending_balance',
      address: LOWER,
      pendingWei: '-1000000000000000000',
    });
    expect(event.pending.min()).toBe(-(10n ** 18n));
    expect(mock.received('subscribe')[0]).toEqual({
      action: 'subscribe',
      channel: 'balance',
      pending: true,
      address: LOWER,
    });
  });

  it('maps confirmed transactions', async () => {
    const eth = makeEvmExplorer(mock.baseUrl, makeGlobal());
    const event = await roundTrip((cb) => eth.onTransaction(EVM_ADDR, cb), {
      type: 'history',
      data: { address: LOWER, height: 19234567, block_n: 42 },
    });
    expect(event).toEqual({ address: EVM_ADDR, height: 19234567, blockIndex: 42 });
  });

  it('maps pending transactions of an address', async () => {
    const eth = makeEvmExplorer(mock.baseUrl, makeGlobal());
    const event = await roundTrip((cb) => eth.onPendingTransaction(EVM_ADDR, cb), {
      type: 'pending',
      address: LOWER,
      data: {
        hash: '0xtx',
        from: LOWER,
        to: '0xrecipient',
        value: '1000000000000000000',
        nonce: '42',
        input: '0x',
        gas: '21000',
        gas_price: '30000000000',
        max_fee_per_gas: null,
        max_priority_fee_per_gas: null,
        type: '0',
        chain_id: '1',
        seen_at: 1740391012,
      },
    });
    expect(event).toMatchObject({
      address: EVM_ADDR,
      hash: '0xtx',
      from: LOWER,
      to: '0xrecipient',
      nonce: 42,
      input: '0x',
      gas: 21000n,
      gasPrice: 30000000000n,
      maxFeePerGas: null,
      maxPriorityFeePerGas: null,
      type: 0,
      chainId: 1,
      seenAt: 1740391012,
    });
    expect(event.value.min()).toBe(10n ** 18n);
    expect(mock.received('subscribe')[0]).toEqual({
      action: 'subscribe',
      channel: 'history',
      pending: true,
      address: LOWER,
    });
  });

  it('maps mempool transactions with contract creations', async () => {
    const eth = makeEvmExplorer(mock.baseUrl, makeGlobal());
    const event = await roundTrip((cb) => eth.onMempoolTransaction(cb), {
      type: 'mempool',
      data: {
        hash: '0xtx',
        from: LOWER,
        to: null,
        value: '0',
        nonce: '1',
        input: '0x6080',
        gas: '500000',
        gas_price: null,
        max_fee_per_gas: '40000000000',
        max_priority_fee_per_gas: '2000000000',
        type: '2',
        chain_id: null,
        seen_at: 1740391012,
      },
    });
    expect(event.to).toBeNull();
    expect(event.value.min()).toBe(0n);
    expect(event.gasPrice).toBeNull();
    expect(event.maxFeePerGas).toBe(40000000000n);
    expect(event.maxPriorityFeePerGas).toBe(2000000000n);
    expect(event.type).toBe(2);
    expect(event.chainId).toBeNull();
  });

  it('maps contract interactions', async () => {
    const eth = makeEvmExplorer(mock.baseUrl, makeGlobal());
    const event = await roundTrip((cb) => eth.onContractInteraction(EVM_ADDR, cb), {
      type: 'contract_interaction',
      data: {
        address: LOWER,
        contract: '0xdac17f958d2ee523a2206206994597c13d831ec7',
        height: 19234567,
      },
    });
    expect(event).toEqual({
      address: EVM_ADDR,
      contract: '0xdac17f958d2ee523a2206206994597c13d831ec7',
      height: 19234567,
    });
    expect(mock.received('subscribe')[0]).toEqual({
      action: 'subscribe',
      channel: 'contract_interactions',
      address: LOWER,
    });
  });
});
