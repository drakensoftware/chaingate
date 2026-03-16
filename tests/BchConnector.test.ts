import { describe, it, expect } from 'vitest';
import { ChainGate, importWallet, NotEnoughFundsError } from '../src';
import { getTestPhrase, getTestApiKey } from './helpers';

describe('BchConnector (Bitcoin Cash)', () => {
  it('derives all address types', async () => {
    const wallet = importWallet({ phrase: getTestPhrase() });
    const cg = new ChainGate({ apiKey: getTestApiKey() });
    const bch = cg.connect(cg.networks.bitcoincash, wallet);

    // Default (cashaddr)
    expect(await bch.address()).toBe('bitcoincash:qrt7fjrlh7eyqnsrpc0drzrdsyu7wdhmlguvqwz4lk');
    expect(await bch.address({ addressType: 'cashaddr' })).toBe(
      'bitcoincash:qrt7fjrlh7eyqnsrpc0drzrdsyu7wdhmlguvqwz4lk',
    );

    // Legacy
    expect(await bch.address({ addressType: 'legacy' })).toBe('1LgYMNydv74dHHK8BhRteV3pcpAFZLCgdt');
  });

  it('gets address balance', async () => {
    const wallet = importWallet({ phrase: getTestPhrase() });
    const cg = new ChainGate({ apiKey: getTestApiKey() });
    const bch = cg.connect(cg.networks.bitcoincash, wallet);

    const balance = await bch.addressBalance();
    expect(balance.confirmed.base().toString()).toMatchSnapshot();
    expect(balance.unconfirmed.base().toString()).toMatchSnapshot();
  });

  it('transfer - not enough funds for large amount', async () => {
    const wallet = importWallet({ phrase: getTestPhrase() });
    const cg = new ChainGate({ apiKey: getTestApiKey() });
    const bch = cg.connect(cg.networks.bitcoincash, wallet);

    const amount = cg.networks.bitcoincash.amount(1);
    const tx = await bch.transfer(amount, 'bitcoincash:qq5e70rwvh6c6qqcspljp7ef9pfzzxdf6qwgh85w7k');
    const fees = tx.recommendedFees();
    expect(fees.normal.enoughFunds).toBe(false);

    await expect(tx.signAndBroadcast()).rejects.toThrow(NotEnoughFundsError);
  });

  it('transfer - enough funds and broadcast', async () => {
    const wallet = importWallet({ phrase: getTestPhrase() });
    const cg = new ChainGate({ apiKey: getTestApiKey() });
    const bch = cg.connect(cg.networks.bitcoincash, wallet);

    const amount = cg.networks.bitcoincash.amount(0.0004);
    const tx = await bch.transfer(amount, 'bitcoincash:qq5e70rwvh6c6qqcspljp7ef9pfzzxdf6qwgh85w7k');
    const fees = tx.recommendedFees();
    expect(fees.normal.enoughFunds).toBe(true);

    const broadcasted = await tx.signAndBroadcast();
    expect(broadcasted.transactionId).toMatchSnapshot();
  });
});
