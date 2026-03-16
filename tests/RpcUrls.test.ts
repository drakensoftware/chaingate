import { describe, it, expect } from 'vitest';
import { ChainGate } from '../src';
import { getTestApiKey } from './helpers';

/** Sends a JSON-RPC request and returns the result. */
async function rpcCall(url: string, method: string, params: unknown[] = []): Promise<unknown> {
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ jsonrpc: '2.0', method, params, id: 1 }),
  });
  const json = (await res.json()) as {
    result?: unknown;
    error?: { code: number; message: string } | null;
  };
  if (json.error) throw new Error(`RPC error: ${json.error.message}`);
  return json.result;
}

/** 64-char hex hash pattern (block hashes). */
const BLOCK_HASH_RE = /^[0-9a-f]{64}$/;

describe('RpcUrls', () => {
  // ---------------------------------------------------------------------------
  // EVM networks — eth_chainId
  // ---------------------------------------------------------------------------

  it('ethereum - eth_chainId returns 0x1', async () => {
    const cg = new ChainGate({ apiKey: getTestApiKey() });
    const chainId = await rpcCall(cg.rpcUrls.ethereum, 'eth_chainId');
    expect(chainId).toBe('0x1');
  });

  it('polygon - eth_chainId returns 0x89', async () => {
    const cg = new ChainGate({ apiKey: getTestApiKey() });
    const chainId = await rpcCall(cg.rpcUrls.polygon, 'eth_chainId');
    expect(chainId).toBe('0x89');
  });

  it('arbitrum - eth_chainId returns 0xa4b1', async () => {
    const cg = new ChainGate({ apiKey: getTestApiKey() });
    const chainId = await rpcCall(cg.rpcUrls.arbitrum, 'eth_chainId');
    expect(chainId).toBe('0xa4b1');
  });

  it('avalanche - eth_chainId returns 0xa86a', async () => {
    const cg = new ChainGate({ apiKey: getTestApiKey() });
    const chainId = await rpcCall(cg.rpcUrls.avalanche, 'eth_chainId');
    expect(chainId).toBe('0xa86a');
  });

  it('bnb - eth_chainId returns 0x38', async () => {
    const cg = new ChainGate({ apiKey: getTestApiKey() });
    const chainId = await rpcCall(cg.rpcUrls.bnb, 'eth_chainId');
    expect(chainId).toBe('0x38');
  });

  it('base - eth_chainId returns 0x2105', async () => {
    const cg = new ChainGate({ apiKey: getTestApiKey() });
    const chainId = await rpcCall(cg.rpcUrls.base, 'eth_chainId');
    expect(chainId).toBe('0x2105');
  });

  it('sonic - eth_chainId returns 0x92', async () => {
    const cg = new ChainGate({ apiKey: getTestApiKey() });
    const chainId = await rpcCall(cg.rpcUrls.sonic, 'eth_chainId');
    expect(chainId).toBe('0x92');
  });

  // ---------------------------------------------------------------------------
  // EVM via network descriptor rpcUrl
  // ---------------------------------------------------------------------------

  it('network descriptor rpcUrl works for ethereum', async () => {
    const cg = new ChainGate({ apiKey: getTestApiKey() });
    const chainId = await rpcCall(cg.networks.ethereum.rpcUrl, 'eth_chainId');
    expect(chainId).toBe('0x1');
  });

  // ---------------------------------------------------------------------------
  // UTXO networks — getbestblockhash
  // ---------------------------------------------------------------------------

  it('bitcoin - getbestblockhash returns a valid block hash', async () => {
    const cg = new ChainGate({ apiKey: getTestApiKey() });
    const hash = await rpcCall(cg.rpcUrls.bitcoin, 'getbestblockhash');
    expect(hash).toMatch(BLOCK_HASH_RE);
  });

  it('litecoin - getbestblockhash returns a valid block hash', async () => {
    const cg = new ChainGate({ apiKey: getTestApiKey() });
    const hash = await rpcCall(cg.rpcUrls.litecoin, 'getbestblockhash');
    expect(hash).toMatch(BLOCK_HASH_RE);
  });

  it('dogecoin - getbestblockhash returns a valid block hash', async () => {
    const cg = new ChainGate({ apiKey: getTestApiKey() });
    const hash = await rpcCall(cg.rpcUrls.dogecoin, 'getbestblockhash');
    expect(hash).toMatch(BLOCK_HASH_RE);
  });

  it('bitcoincash - getbestblockhash returns a valid block hash', async () => {
    const cg = new ChainGate({ apiKey: getTestApiKey() });
    const hash = await rpcCall(cg.rpcUrls.bitcoincash, 'getbestblockhash');
    expect(hash).toMatch(BLOCK_HASH_RE);
  });

  it('bitcointestnet - getbestblockhash returns a valid block hash', async () => {
    const cg = new ChainGate({ apiKey: getTestApiKey() });
    const hash = await rpcCall(cg.rpcUrls.bitcoinTestnet, 'getbestblockhash');
    expect(hash).toMatch(BLOCK_HASH_RE);
  });

  // ---------------------------------------------------------------------------
  // cg.rpcUrls.get() dynamic accessor
  // ---------------------------------------------------------------------------

  it('get() works for any network', async () => {
    const cg = new ChainGate({ apiKey: getTestApiKey() });
    const chainId = await rpcCall(cg.rpcUrls.get('avalanche'), 'eth_chainId');
    expect(chainId).toBe('0xa86a');
  });
});
