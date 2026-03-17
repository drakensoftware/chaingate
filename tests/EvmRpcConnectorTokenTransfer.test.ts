import { describe, it, expect } from 'vitest';
import { ChainGate, importWallet, NotEnoughFundsError } from '../src';
import { getTestPhrase, getTestApiKey } from './helpers';

const AVALANCHE_RPC = 'https://avalanche-c-chain-rpc.publicnode.com';
const AVALANCHE_CHAIN_ID = 43114;

// Deployed by scripts/deploy-test-contracts.ts (one-time) on Avalanche C-Chain.
const AVAX_ERC20 = '0x3be5123ff8c89f6f5b1c70cd82e2ff70eb8d1475';
const AVAX_ERC721 = '0x356ed8f4553817412ff2fe53e8e3d14dbaf419fb';
const AVAX_ERC1155 = '0xd37d5f87c5b607b7d665e9109c23bfbea5185bae';

function createAvalancheNetwork(cg: ChainGate) {
  return cg.networks.evmRpc({
    rpcUrl: AVALANCHE_RPC,
    chainId: AVALANCHE_CHAIN_ID,
    name: 'Avalanche',
    symbol: 'AVAX',
    nativeTokenName: 'Avalanche',
  });
}

describe('EvmRpcConnector Token Transfers (Avalanche via RPC)', () => {
  it('transferToken - ERC-20 transfer succeeds', async () => {
    const wallet = importWallet({ phrase: getTestPhrase() });
    const cg = new ChainGate({ apiKey: getTestApiKey() });
    const network = createAvalancheNetwork(cg);
    const conn = cg.connect(network, wallet);

    const recipient = await conn.address({ index: 1 });

    // Transfer 1 TT token — decimals are resolved automatically
    const tx = await conn.transferToken(AVAX_ERC20, '1', recipient);

    expect(tx.enoughFunds()).toBe(true);
    const fee = tx.currentFee();
    expect(fee.maxFeePerGas).toBeGreaterThan(0n);

    const broadcasted = await tx.signAndBroadcast();
    expect(broadcasted.transactionId).toMatch(/^0x[0-9a-f]{64}$/);
    expect(broadcasted.transactionId).toMatchSnapshot();
  });

  it('transferNft - ERC-721 safeTransferFrom succeeds', async () => {
    const wallet = importWallet({ phrase: getTestPhrase() });
    const cg = new ChainGate({ apiKey: getTestApiKey() });
    const network = createAvalancheNetwork(cg);
    const conn = cg.connect(network, wallet);

    const recipient = await conn.address({ index: 1 });

    // Transfer NFT token ID 1
    const tx = await conn.transferNft(AVAX_ERC721, '1', recipient);

    expect(tx.enoughFunds()).toBe(true);

    const broadcasted = await tx.signAndBroadcast();
    expect(broadcasted.transactionId).toMatch(/^0x[0-9a-f]{64}$/);
    expect(broadcasted.transactionId).toMatchSnapshot();
  });

  it('transferErc1155 - ERC-1155 safeTransferFrom succeeds', async () => {
    const wallet = importWallet({ phrase: getTestPhrase() });
    const cg = new ChainGate({ apiKey: getTestApiKey() });
    const network = createAvalancheNetwork(cg);
    const conn = cg.connect(network, wallet);

    const recipient = await conn.address({ index: 1 });

    // Transfer 5 units of token ID 1
    const tx = await conn.transferErc1155(AVAX_ERC1155, '1', 5n, recipient);

    expect(tx.enoughFunds()).toBe(true);

    const broadcasted = await tx.signAndBroadcast();
    expect(broadcasted.transactionId).toMatch(/^0x[0-9a-f]{64}$/);
    expect(broadcasted.transactionId).toMatchSnapshot();
  });

  it('transferToken - not enough AVAX for gas', async () => {
    const wallet = importWallet({ phrase: getTestPhrase() });
    const cg = new ChainGate({ apiKey: getTestApiKey() });
    const network = createAvalancheNetwork(cg);
    const conn = cg.connect(network, wallet);

    // Use index 5 — this derived address has no AVAX for gas
    const tx = await conn.transferToken(
      AVAX_ERC20,
      '1',
      '0x1853be2c350EB9588bdC2Af73bDAA0C4B8Ac3583',
      { index: 5 },
    );

    expect(tx.enoughFunds()).toBe(false);
    await expect(tx.signAndBroadcast()).rejects.toThrow(NotEnoughFundsError);
  });
});
