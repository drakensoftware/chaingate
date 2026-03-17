import { describe, it, expect } from 'vitest';
import { ChainGate, importWallet, NotEnoughFundsError } from '../src';
import { getTestPhrase, getTestApiKey } from './helpers';

// Deployed by scripts/deploy-test-contracts.ts (one-time) on Ethereum mainnet.
const ETH_ERC20 = '0xd37d5f87c5b607b7d665e9109c23bfbea5185bae';
const ETH_ERC721 = '0x6445149016e286607c916d5e87258e30ad4d3afb';
const ETH_ERC1155 = '0xd174781758d39bc10a1efbb8fb3a173e337ac47e';

describe('EvmConnector Token Transfers (Ethereum)', () => {
  it('transferToken - ERC-20 transfer succeeds', async () => {
    const wallet = importWallet({ phrase: getTestPhrase() });
    const cg = new ChainGate({ apiKey: getTestApiKey() });
    const eth = cg.connect(cg.networks.ethereum, wallet);

    const recipient = await eth.address({ index: 1 });

    // Transfer 1 TT token — decimals are resolved automatically
    const tx = await eth.transferToken(ETH_ERC20, '1', recipient);

    const fees = tx.recommendedFees();
    expect(fees.normal.enoughFunds).toBe(true);

    const broadcasted = await tx.signAndBroadcast();
    expect(broadcasted.transactionId).toMatch(/^0x[0-9a-f]{64}$/);
    expect(broadcasted.transactionId).toMatchSnapshot();
  });

  it('transferNft - ERC-721 safeTransferFrom succeeds', async () => {
    const wallet = importWallet({ phrase: getTestPhrase() });
    const cg = new ChainGate({ apiKey: getTestApiKey() });
    const eth = cg.connect(cg.networks.ethereum, wallet);

    const recipient = await eth.address({ index: 1 });

    // Transfer NFT token ID 1
    const tx = await eth.transferNft(ETH_ERC721, '1', recipient);

    const fees = tx.recommendedFees();
    expect(fees.normal.enoughFunds).toBe(true);

    const broadcasted = await tx.signAndBroadcast();
    expect(broadcasted.transactionId).toMatch(/^0x[0-9a-f]{64}$/);
    expect(broadcasted.transactionId).toMatchSnapshot();
  });

  it('transferErc1155 - ERC-1155 safeTransferFrom succeeds', async () => {
    const wallet = importWallet({ phrase: getTestPhrase() });
    const cg = new ChainGate({ apiKey: getTestApiKey() });
    const eth = cg.connect(cg.networks.ethereum, wallet);

    const recipient = await eth.address({ index: 1 });

    // Transfer 5 units of token ID 1
    const tx = await eth.transferErc1155(ETH_ERC1155, '1', 5n, recipient);

    const fees = tx.recommendedFees();
    expect(fees.normal.enoughFunds).toBe(true);

    const broadcasted = await tx.signAndBroadcast();
    expect(broadcasted.transactionId).toMatch(/^0x[0-9a-f]{64}$/);
    expect(broadcasted.transactionId).toMatchSnapshot();
  });

  it('transferToken - not enough ETH for gas', async () => {
    const wallet = importWallet({ phrase: getTestPhrase() });
    const cg = new ChainGate({ apiKey: getTestApiKey() });
    const eth = cg.connect(cg.networks.ethereum, wallet);

    // Use index 5 — this derived address has no ETH for gas
    const tx = await eth.transferToken(
      ETH_ERC20,
      '1',
      '0x1853be2c350EB9588bdC2Af73bDAA0C4B8Ac3583',
      { index: 5 },
    );

    const fees = tx.recommendedFees();
    expect(fees.normal.enoughFunds).toBe(false);
    await expect(tx.signAndBroadcast()).rejects.toThrow(NotEnoughFundsError);
  });
});
