import { describe, it, expect } from 'vitest';
import { ChainGate, importWallet, NotEnoughFundsError } from '../src';
import { getTestPhrase, getTestApiKey } from './helpers';

const AVAX_ERC20 = '0x3be5123Ff8C89F6F5b1c70CD82e2fF70Eb8D1475';
const AVAX_ERC721 = '0x356eD8F4553817412Ff2FE53E8e3D14dbaf419fb';
const AVAX_ERC1155 = '0xD37D5F87c5B607b7D665e9109C23BfBEa5185baE';

describe('EvmConnector Token Transfers (Avalanche)', () => {
  it('transferToken - ERC-20 transfer succeeds', async () => {
    const wallet = importWallet({ phrase: getTestPhrase() });
    const cg = new ChainGate({ apiKey: getTestApiKey() });
    const avax = cg.connect(cg.networks.avalanche, wallet);

    const recipient = await avax.address({ index: 1 });

    // Transfer 1 TT token — decimals are resolved automatically
    const tx = await avax.transferToken(AVAX_ERC20, '1', recipient);

    const fees = tx.recommendedFees();
    expect(fees.normal.enoughFunds).toBe(true);

    const broadcasted = await tx.signAndBroadcast();
    expect(broadcasted.transactionId).toMatch(/^0x[0-9a-f]{64}$/);
    expect(broadcasted.transactionId).toMatchSnapshot();
  });

  it('transferNft - ERC-721 safeTransferFrom succeeds', async () => {
    const wallet = importWallet({ phrase: getTestPhrase() });
    const cg = new ChainGate({ apiKey: getTestApiKey() });
    const avax = cg.connect(cg.networks.avalanche, wallet);

    const recipient = await avax.address({ index: 1 });

    // Transfer NFT token ID 1
    const tx = await avax.transferNft(AVAX_ERC721, '1', recipient);

    const fees = tx.recommendedFees();
    expect(fees.normal.enoughFunds).toBe(true);

    const broadcasted = await tx.signAndBroadcast();
    expect(broadcasted.transactionId).toMatch(/^0x[0-9a-f]{64}$/);
    expect(broadcasted.transactionId).toMatchSnapshot();
  });

  it('transferErc1155 - ERC-1155 safeTransferFrom succeeds', async () => {
    const wallet = importWallet({ phrase: getTestPhrase() });
    const cg = new ChainGate({ apiKey: getTestApiKey() });
    const avax = cg.connect(cg.networks.avalanche, wallet);

    const recipient = await avax.address({ index: 1 });

    // Transfer 5 units of token ID 1
    const tx = await avax.transferErc1155(AVAX_ERC1155, '1', 5n, recipient);

    const fees = tx.recommendedFees();
    expect(fees.normal.enoughFunds).toBe(true);

    const broadcasted = await tx.signAndBroadcast();
    expect(broadcasted.transactionId).toMatch(/^0x[0-9a-f]{64}$/);
    expect(broadcasted.transactionId).toMatchSnapshot();
  });

  it('transferToken - not enough AVAX for gas', async () => {
    const wallet = importWallet({ phrase: getTestPhrase() });
    const cg = new ChainGate({ apiKey: getTestApiKey() });
    const avax = cg.connect(cg.networks.avalanche, wallet);

    // Use index 5 — this derived address has no AVAX for gas
    const tx = await avax.transferToken(
      AVAX_ERC20,
      '1',
      '0x1853be2c350EB9588bdC2Af73bDAA0C4B8Ac3583',
      { index: 5 },
    );

    const fees = tx.recommendedFees();
    expect(fees.normal.enoughFunds).toBe(false);
    await expect(tx.signAndBroadcast()).rejects.toThrow(NotEnoughFundsError);
  });
});
