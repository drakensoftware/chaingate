import { describe, it, expect } from 'vitest';
import { ChainGate, importWallet, NotEnoughFundsError } from '../src';
import { getTestPhrase, getTestApiKey } from './helpers';

// ---------------------------------------------------------------------------
// Bitcoin
// ---------------------------------------------------------------------------

describe('UtxoConnector (Bitcoin)', () => {
  it('derives all address types', async () => {
    const wallet = importWallet({ phrase: getTestPhrase() });
    const cg = new ChainGate({ apiKey: getTestApiKey() });
    const btc = cg.connect(cg.networks.bitcoin, wallet);

    // Default (segwit)
    expect(await btc.address()).toBe('bc1qcu2aq327lzgee5f9vqm7m23fhck39ja7j37ass');
    expect(await btc.address({ addressType: 'segwit' })).toBe(
      'bc1qcu2aq327lzgee5f9vqm7m23fhck39ja7j37ass',
    );

    // Taproot
    expect(await btc.address({ addressType: 'taproot' })).toBe(
      'bc1ps6lm9t9yx6etly4y06hvqwyyzk4pc0j02w58s2frsgxlsh5hv47qvermj7',
    );

    // Legacy
    expect(await btc.address({ addressType: 'legacy' })).toBe('1BeH9f5U1N6nyvMwzzqyzEEGd2FaNReK9J');
  });

  it('gets address balance', async () => {
    const wallet = importWallet({ phrase: getTestPhrase() });
    const cg = new ChainGate({ apiKey: getTestApiKey() });
    const btc = cg.connect(cg.networks.bitcoin, wallet);

    const balance = await btc.addressBalance();
    expect(balance.confirmed.base().toString()).toMatchSnapshot();
    expect(balance.unconfirmed.base().toString()).toMatchSnapshot();
  });

  it('transfer - not enough funds for large amount', async () => {
    const wallet = importWallet({ phrase: getTestPhrase() });
    const cg = new ChainGate({ apiKey: getTestApiKey() });
    const btc = cg.connect(cg.networks.bitcoin, wallet);

    const amount = cg.networks.bitcoin.amount(1);
    const tx = await btc.transfer(amount, 'bc1qv5r9mr7ajz2jh04d87c4nnhfjj0jqhm3z5v0hx');
    const fees = tx.recommendedFees();
    expect(fees.normal.enoughFunds).toBe(false);

    await expect(tx.signAndBroadcast()).rejects.toThrow(NotEnoughFundsError);
  });

  it('transfer - enough funds and broadcast', async () => {
    const wallet = importWallet({ phrase: getTestPhrase() });
    const cg = new ChainGate({ apiKey: getTestApiKey() });
    const btc = cg.connect(cg.networks.bitcoin, wallet);

    const amount = cg.networks.bitcoin.amount(0.000005);
    const tx = await btc.transfer(amount, 'bc1qv5r9mr7ajz2jh04d87c4nnhfjj0jqhm3z5v0hx');
    const fees = tx.recommendedFees();
    expect(fees.normal.enoughFunds).toBe(true);

    const broadcasted = await tx.signAndBroadcast();
    expect(broadcasted.transactionId).toMatchSnapshot();
  });
});

// ---------------------------------------------------------------------------
// Bitcoin Testnet
// ---------------------------------------------------------------------------

describe('UtxoConnector (Bitcoin Testnet)', () => {
  it('derives all address types', async () => {
    const wallet = importWallet({ phrase: getTestPhrase() });
    const cg = new ChainGate({ apiKey: getTestApiKey() });
    const btcTestnet = cg.connect(cg.networks.bitcointestnet, wallet);

    // Default (segwit)
    expect(await btcTestnet.address()).toBe('tb1qq7vl6uc3wp0k3nrehnf9l392acmh7vxwawss73');
    expect(await btcTestnet.address({ addressType: 'segwit' })).toBe(
      'tb1qq7vl6uc3wp0k3nrehnf9l392acmh7vxwawss73',
    );

    // Taproot
    expect(await btcTestnet.address({ addressType: 'taproot' })).toBe(
      'tb1pqxq7tdnh04sc7tjzfgqfz3a9vj0clvk49fjsdmrlrrv953c9kfcsw5uajn',
    );

    // Legacy
    expect(await btcTestnet.address({ addressType: 'legacy' })).toBe(
      'mj3v1VqG2PWr3C62cj1hHwNW9k2PjkrV6m',
    );
  });

  it('gets address balance', async () => {
    const wallet = importWallet({ phrase: getTestPhrase() });
    const cg = new ChainGate({ apiKey: getTestApiKey() });
    const btcTestnet = cg.connect(cg.networks.bitcointestnet, wallet);

    const balance = await btcTestnet.addressBalance();
    expect(balance.confirmed.base().toString()).toMatchSnapshot();
    expect(balance.unconfirmed.base().toString()).toMatchSnapshot();
  });

  it('transfer - not enough funds for large amount', async () => {
    const wallet = importWallet({ phrase: getTestPhrase() });
    const cg = new ChainGate({ apiKey: getTestApiKey() });
    const btcTestnet = cg.connect(cg.networks.bitcointestnet, wallet);

    const amount = cg.networks.bitcointestnet.amount(1);
    const tx = await btcTestnet.transfer(amount, 'tb1qkshdpuwr4mexg3p44um47mnvzywsjmttrng7sg');
    const fees = tx.recommendedFees();
    expect(fees.normal.enoughFunds).toBe(false);

    await expect(tx.signAndBroadcast()).rejects.toThrow(NotEnoughFundsError);
  });

  it('transfer - enough funds and broadcast', async () => {
    const wallet = importWallet({ phrase: getTestPhrase() });
    const cg = new ChainGate({ apiKey: getTestApiKey() });
    const btcTestnet = cg.connect(cg.networks.bitcointestnet, wallet);

    const amount = cg.networks.bitcointestnet.amount(0.000005);
    const tx = await btcTestnet.transfer(amount, 'tb1qkshdpuwr4mexg3p44um47mnvzywsjmttrng7sg');
    const fees = tx.recommendedFees();
    expect(fees.normal.enoughFunds).toBe(true);

    const broadcasted = await tx.signAndBroadcast();
    expect(broadcasted.transactionId).toMatchSnapshot();
  });
});

// ---------------------------------------------------------------------------
// Litecoin
// ---------------------------------------------------------------------------

describe('UtxoConnector (Litecoin)', () => {
  it('derives all address types', async () => {
    const wallet = importWallet({ phrase: getTestPhrase() });
    const cg = new ChainGate({ apiKey: getTestApiKey() });
    const ltc = cg.connect(cg.networks.litecoin, wallet);

    // Default (segwit)
    expect(await ltc.address()).toBe('ltc1qqj680mj4zw20ze56tljlwhtnwllwwzayraveyu');
    expect(await ltc.address({ addressType: 'segwit' })).toBe(
      'ltc1qqj680mj4zw20ze56tljlwhtnwllwwzayraveyu',
    );

    // Taproot
    expect(await ltc.address({ addressType: 'taproot' })).toBe(
      'ltc1p3u0xzj62e0da704c7agkwygjhzm4hddgz2glam5se407t4ralnmsc3ltcw',
    );

    // Legacy
    expect(await ltc.address({ addressType: 'legacy' })).toBe('LaXvFaji6NxzzuJisZ37avtKNHYpMm3zAw');
  });

  it('gets address balance', async () => {
    const wallet = importWallet({ phrase: getTestPhrase() });
    const cg = new ChainGate({ apiKey: getTestApiKey() });
    const ltc = cg.connect(cg.networks.litecoin, wallet);

    const balance = await ltc.addressBalance();
    expect(balance.confirmed.base().toString()).toMatchSnapshot();
    expect(balance.unconfirmed.base().toString()).toMatchSnapshot();
  });

  it('transfer - not enough funds for large amount', async () => {
    const wallet = importWallet({ phrase: getTestPhrase() });
    const cg = new ChainGate({ apiKey: getTestApiKey() });
    const ltc = cg.connect(cg.networks.litecoin, wallet);

    const amount = cg.networks.litecoin.amount(1000);
    const tx = await ltc.transfer(amount, 'ltc1qrddqs28h0dkf3d00lfu39w7czz5762tja9ast3');
    const fees = tx.recommendedFees();
    expect(fees.normal.enoughFunds).toBe(false);

    await expect(tx.signAndBroadcast()).rejects.toThrow(NotEnoughFundsError);
  });

  it('transfer - enough funds and broadcast', async () => {
    const wallet = importWallet({ phrase: getTestPhrase() });
    const cg = new ChainGate({ apiKey: getTestApiKey() });
    const ltc = cg.connect(cg.networks.litecoin, wallet);

    const amount = cg.networks.litecoin.amount(0.001);
    const tx = await ltc.transfer(amount, 'ltc1qrddqs28h0dkf3d00lfu39w7czz5762tja9ast3');
    const fees = tx.recommendedFees();
    expect(fees.normal.enoughFunds).toBe(true);

    const broadcasted = await tx.signAndBroadcast();
    expect(broadcasted.transactionId).toMatchSnapshot();
  });
});

// ---------------------------------------------------------------------------
// Dogecoin
// ---------------------------------------------------------------------------

describe('UtxoConnector (Dogecoin)', () => {
  it('derives the correct address', async () => {
    const wallet = importWallet({ phrase: getTestPhrase() });
    const cg = new ChainGate({ apiKey: getTestApiKey() });
    const doge = cg.connect(cg.networks.dogecoin, wallet);

    // Default (legacy — only supported type)
    expect(await doge.address()).toBe('DKjYavqdvAFLkvxVzFuks7De1Qho3Ashfy');
    expect(await doge.address({ addressType: 'legacy' })).toBe(
      'DKjYavqdvAFLkvxVzFuks7De1Qho3Ashfy',
    );
  });

  it('gets address balance', async () => {
    const wallet = importWallet({ phrase: getTestPhrase() });
    const cg = new ChainGate({ apiKey: getTestApiKey() });
    const doge = cg.connect(cg.networks.dogecoin, wallet);

    const balance = await doge.addressBalance();
    expect(balance.confirmed.base().toString()).toMatchSnapshot();
    expect(balance.unconfirmed.base().toString()).toMatchSnapshot();
  });

  it('transfer - not enough funds for large amount', async () => {
    const wallet = importWallet({ phrase: getTestPhrase() });
    const cg = new ChainGate({ apiKey: getTestApiKey() });
    const doge = cg.connect(cg.networks.dogecoin, wallet);

    const amount = cg.networks.dogecoin.amount(1000);
    const tx = await doge.transfer(amount, 'DEfUXm8EQjygL3v1yrNzDjw5HzZiVZPyvf');
    const fees = tx.recommendedFees();
    expect(fees.normal.enoughFunds).toBe(false);

    await expect(tx.signAndBroadcast()).rejects.toThrow(NotEnoughFundsError);
  });

  it('transfer - enough funds and broadcast', async () => {
    const wallet = importWallet({ phrase: getTestPhrase() });
    const cg = new ChainGate({ apiKey: getTestApiKey() });
    const doge = cg.connect(cg.networks.dogecoin, wallet);

    const amount = cg.networks.dogecoin.amount(1);
    const tx = await doge.transfer(amount, 'DEfUXm8EQjygL3v1yrNzDjw5HzZiVZPyvf');
    const fees = tx.recommendedFees();
    expect(fees.normal.enoughFunds).toBe(true);

    const broadcasted = await tx.signAndBroadcast();
    expect(broadcasted.transactionId).toMatchSnapshot();
  });
});
