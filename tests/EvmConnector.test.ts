import { describe, it, expect } from 'vitest';
import { ChainGate, importWallet, NotEnoughFundsError } from '../src';
import { getTestPhrase, getTestApiKey } from './helpers';

describe('EvmConnector (Ethereum)', () => {
  it('derives the correct address', async () => {
    const wallet = importWallet({ phrase: getTestPhrase() });
    const cg = new ChainGate({ apiKey: getTestApiKey() });
    const eth = cg.connect(cg.networks.ethereum, wallet);

    const address = await eth.address();
    expect(address).toBe('0xE7c19D5A90352b5eE0144363D1191E2549Ca2146');
  });

  it('gets address balance', async () => {
    const wallet = importWallet({ phrase: getTestPhrase() });
    const cg = new ChainGate({ apiKey: getTestApiKey() });
    const eth = cg.connect(cg.networks.ethereum, wallet);

    const balance = await eth.addressBalance();
    expect(balance.confirmed.base().toString()).toMatchSnapshot();
    expect(balance.unconfirmed.base().toString()).toMatchSnapshot();
  });

  it('transfer - not enough funds for large amount', async () => {
    const wallet = importWallet({ phrase: getTestPhrase() });
    const cg = new ChainGate({ apiKey: getTestApiKey() });
    const eth = cg.connect(cg.networks.ethereum, wallet);

    const amount = cg.networks.ethereum.amount(1000);
    const tx = await eth.transfer(amount, '0x1853be2c350EB9588bdC2Af73bDAA0C4B8Ac3583');
    const fees = tx.recommendedFees();
    expect(fees.normal.enoughFunds).toBe(false);

    await expect(tx.signAndBroadcast()).rejects.toThrow(NotEnoughFundsError);
  });

  it('transfer - enough funds and broadcast', async () => {
    const wallet = importWallet({ phrase: getTestPhrase() });
    const cg = new ChainGate({ apiKey: getTestApiKey() });
    const eth = cg.connect(cg.networks.ethereum, wallet);

    const amount = cg.networks.ethereum.amount(0.001);
    const tx = await eth.transfer(amount, '0x1853be2c350EB9588bdC2Af73bDAA0C4B8Ac3583');
    const fees = tx.recommendedFees();
    expect(fees.normal.enoughFunds).toBe(true);

    const broadcasted = await tx.signAndBroadcast();
    expect(broadcasted.transactionId).toMatchSnapshot();
  });
});
