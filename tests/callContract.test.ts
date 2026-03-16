import { describe, it, expect } from 'vitest';
import {
  ChainGate,
  importWallet,
  UnsupportedOperationError,
  NotEnoughFundsError,
  EvmTransaction,
} from '../src';
import { getTestPhrase, getTestApiKey } from './helpers';

describe('EvmConnector.callContract (Ethereum)', () => {
  it('creates a contract call transaction', async () => {
    const wallet = importWallet({ phrase: getTestPhrase() });
    const cg = new ChainGate({ apiKey: getTestApiKey() });
    const eth = cg.connect(cg.networks.ethereum, wallet);

    const amount = cg.networks.ethereum.amount(0);
    const tx = await eth.callContract(
      '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48', // USDC contract
      '0x70a08231000000000000000000000000E7c19D5A90352b5eE0144363D1191E2549Ca2146', // balanceOf(address)
      amount,
    );

    expect(tx).toBeInstanceOf(EvmTransaction);
    const fees = tx.recommendedFees();
    expect(fees.normal).toBeDefined();
    expect(typeof fees.normal.maxFeePerGas).toBe('bigint');
  });

  it('callContract - not enough funds for large ETH value', async () => {
    const wallet = importWallet({ phrase: getTestPhrase() });
    const cg = new ChainGate({ apiKey: getTestApiKey() });
    const eth = cg.connect(cg.networks.ethereum, wallet);

    const amount = cg.networks.ethereum.amount(1000);
    const tx = await eth.callContract(
      '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48',
      '0x70a08231000000000000000000000000E7c19D5A90352b5eE0144363D1191E2549Ca2146',
      amount,
    );
    const fees = tx.recommendedFees();
    expect(fees.normal.enoughFunds).toBe(false);

    await expect(tx.signAndBroadcast()).rejects.toThrow(NotEnoughFundsError);
  });

  it('rejects view-only wallets', async () => {
    const wallet = importWallet({
      publicKey: '03aaeb52dd7494c361049de67cc680e83ebcbbbdbeb13637d92cd845f70308af5e',
    });
    const cg = new ChainGate({ apiKey: getTestApiKey() });
    const eth = cg.connect(cg.networks.ethereum, wallet);

    const amount = cg.networks.ethereum.amount(0);
    await expect(
      eth.callContract('0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48', '0x70a08231', amount),
    ).rejects.toThrow(UnsupportedOperationError);
  });
});
