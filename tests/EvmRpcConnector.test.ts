import { describe, it, expect } from 'vitest';
import { ChainGate, importWallet, NotEnoughFundsError, EvmRpcExplorer } from '../src';
import { getTestPhrase, getTestApiKey } from './helpers';

const AVALANCHE_RPC = 'https://avalanche-c-chain-rpc.publicnode.com';
const AVALANCHE_CHAIN_ID = 43114;

function createAvalancheNetwork(cg: ChainGate) {
  return cg.networks.evmRpc({
    rpcUrl: AVALANCHE_RPC,
    chainId: AVALANCHE_CHAIN_ID,
    name: 'Avalanche',
    symbol: 'AVAX',
    nativeTokenName: 'Avalanche',
  });
}

describe('EvmRpcConnector (Avalanche via RPC)', () => {
  it('derives the correct address', async () => {
    const wallet = importWallet({ phrase: getTestPhrase() });
    const cg = new ChainGate({ apiKey: getTestApiKey() });
    const network = createAvalancheNetwork(cg);
    const conn = cg.connect(network, wallet);

    // Same address as Ethereum — shared derivation path m/44'/60'/0'/0/0
    const address = await conn.address();
    expect(address).toBe('0xE7c19D5A90352b5eE0144363D1191E2549Ca2146');
  });

  it('derives address at index 1', async () => {
    const wallet = importWallet({ phrase: getTestPhrase() });
    const cg = new ChainGate({ apiKey: getTestApiKey() });
    const network = createAvalancheNetwork(cg);
    const conn = cg.connect(network, wallet);

    const addr0 = await conn.address({ index: 0 });
    const addr1 = await conn.address({ index: 1 });
    expect(addr0).not.toBe(addr1);
    expect(addr1).toMatch(/^0x[0-9a-fA-F]{40}$/);
  });

  it('gets address balance', async () => {
    const wallet = importWallet({ phrase: getTestPhrase() });
    const cg = new ChainGate({ apiKey: getTestApiKey() });
    const network = createAvalancheNetwork(cg);
    const conn = cg.connect(network, wallet);

    const result = await conn.addressBalance();
    expect(result.address).toBe('0xE7c19D5A90352b5eE0144363D1191E2549Ca2146');
    expect(result.balance.symbol).toBe('AVAX');
    expect(typeof result.balance.min()).toBe('bigint');
    expect(result.balance.min()).toBeGreaterThanOrEqual(0n);
    expect(result.balance.base().toString()).toMatchSnapshot();
  });

  it('creates an Amount with correct metadata', () => {
    const cg = new ChainGate({ apiKey: getTestApiKey() });
    const network = createAvalancheNetwork(cg);

    const amount = network.amount('1.5');
    expect(amount.symbol).toBe('AVAX');
    expect(amount.min()).toBe(1_500_000_000_000_000_000n);
    expect(amount.base()).toBe(1.5);
  });

  it('transfer - not enough funds for large amount', async () => {
    const wallet = importWallet({ phrase: getTestPhrase() });
    const cg = new ChainGate({ apiKey: getTestApiKey() });
    const network = createAvalancheNetwork(cg);
    const conn = cg.connect(network, wallet);

    const amount = network.amount(1_000_000);
    const tx = await conn.transfer(amount, '0x1853be2c350EB9588bdC2Af73bDAA0C4B8Ac3583');

    expect(tx.enoughFunds()).toBe(false);
    await expect(tx.signAndBroadcast()).rejects.toThrow(NotEnoughFundsError);
  });

  it('transfer - fee data is populated', async () => {
    const wallet = importWallet({ phrase: getTestPhrase() });
    const cg = new ChainGate({ apiKey: getTestApiKey() });
    const network = createAvalancheNetwork(cg);
    const conn = cg.connect(network, wallet);

    const amount = network.amount('0.0001');
    const tx = await conn.transfer(amount, '0x1853be2c350EB9588bdC2Af73bDAA0C4B8Ac3583');

    const fee = tx.currentFee();
    expect(fee.maxFeePerGas).toBeGreaterThan(0n);
    expect(typeof fee.maxPriorityFeePerGas).toBe('bigint');
    expect(typeof tx.enoughFunds()).toBe('boolean');
  });

  it('explore returns an EvmRpcExplorer with working RPC calls', async () => {
    const cg = new ChainGate({ apiKey: getTestApiKey() });
    const network = createAvalancheNetwork(cg);
    const explorer = cg.explore(network);

    expect(explorer).toBeInstanceOf(EvmRpcExplorer);
    expect(explorer.chainId).toBe(AVALANCHE_CHAIN_ID);

    const balance = await explorer.getBalance('0xE7c19D5A90352b5eE0144363D1191E2549Ca2146');
    expect(typeof balance).toBe('bigint');
    expect(balance).toBeGreaterThanOrEqual(0n);
  });

  it('transfer - enough funds and broadcast', async () => {
    const wallet = importWallet({ phrase: getTestPhrase() });
    const cg = new ChainGate({ apiKey: getTestApiKey() });
    const network = createAvalancheNetwork(cg);
    const conn = cg.connect(network, wallet);

    const amount = network.amount('0.0001');
    const tx = await conn.transfer(amount, '0x1853be2c350EB9588bdC2Af73bDAA0C4B8Ac3583');
    expect(tx.enoughFunds()).toBe(true);

    const broadcasted = await tx.signAndBroadcast();
    expect(broadcasted.transactionId).toMatchSnapshot();
  });
});
