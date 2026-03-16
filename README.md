<p align="center">
  <img src="./logo.png" alt="ChainGate" height="80" />
</p>

<h1 align="center">ChainGate</h1>

<p align="center">
  Multi-chain cryptocurrency SDK for TypeScript.
  <br />
  Create wallets, query blockchains, and send transactions across Bitcoin, Ethereum, and more.
</p>

<p align="center">
  <a href="https://github.com/drakensoftware/chaingate/actions/workflows/build.yml"><img src="https://github.com/drakensoftware/chaingate/actions/workflows/build.yml/badge.svg" alt="Build" /></a>
  <a href="https://github.com/drakensoftware/chaingate/actions/workflows/test.yml"><img src="https://github.com/drakensoftware/chaingate/actions/workflows/test.yml/badge.svg" alt="Test" /></a>
  <a href="https://github.com/drakensoftware/chaingate/actions/workflows/publish.yml"><img src="https://github.com/drakensoftware/chaingate/actions/workflows/publish.yml/badge.svg" alt="Publish" /></a>
  <a href="https://www.npmjs.com/package/chaingate"><img src="https://img.shields.io/npm/v/chaingate?color=blue&label=npm" alt="npm version" /></a>
  <a href="https://www.npmjs.com/package/chaingate"><img src="https://img.shields.io/npm/dm/chaingate?color=green" alt="npm downloads" /></a>
  <a href="https://docs.chaingate.dev"><img src="https://img.shields.io/badge/docs-chaingate.dev-blueviolet?logo=readthedocs&logoColor=white" alt="Documentation" /></a>
  <a href="https://api.chaingate.dev/dashboard"><img src="https://img.shields.io/badge/API%20Key-dashboard-orange" alt="Get API Key" /></a>
  <img src="https://img.shields.io/badge/node-%3E%3D22-brightgreen" alt="Node.js >= 22" />
  <img src="https://img.shields.io/badge/TypeScript-3178C6?logo=typescript&logoColor=white" alt="TypeScript" />
</p>

---

<h3 align="center">
  📖 <a href="https://docs.chaingate.dev">Documentation</a> &nbsp;&nbsp;|&nbsp;&nbsp; 🔑 <a href="https://api.chaingate.dev/dashboard">Get your free API key</a>
</h3>

---

## Features

- 👛 **Wallet management** -- Create HD wallets from mnemonics, import from seed, xpriv, xpub, private key, WIF, or keystores
- ⛓️ **Multi-chain** -- Bitcoin, Litecoin, Dogecoin, Bitcoin Cash, Ethereum, and any EVM chain via RPC
- 📍 **Address derivation** -- BIP-44/84/86 with segwit, legacy, taproot, cashaddr, and EOA
- 🔍 **Blockchain explorer** -- Balances, transactions, UTXOs, blocks, fees, tokens, and NFT metadata
- 📤 **Transactions** -- Send coins, ERC-20 tokens, NFTs, and call smart contracts with fee tiers
- 🔒 **Encryption** -- AES-256-GCM wallet encryption with password protection
- ✍️ **Message signing** -- EIP-191 (EVM) and Bitcoin-standard signing and verification
- 💱 **Fiat conversion** -- Live conversion to 160+ currencies
- 👁️ **View-only wallets** -- Read-only access from xpub or public key

## Install

```bash
npm install chaingate
```

## Examples

### Create a Wallet and Check Balance

```ts
import { ChainGate, newWallet } from 'chaingate';

const cg = new ChainGate({ apiKey: 'your-api-key' });

const { phrase, wallet } = newWallet();
console.log('Mnemonic:', phrase);

const eth = cg.connect(cg.networks.ethereum, wallet);
const balance = await eth.addressBalance();
console.log(balance.confirmed.base(), balance.confirmed.symbol);
```

### Import a Wallet

```ts
import { importWallet, createWalletFromString } from 'chaingate';

// From mnemonic
const wallet = importWallet({ phrase: 'abandon abandon abandon ...' });

// From private key
importWallet({ privateKey: '0x...' });

// From xpub (view-only)
importWallet({ xpub: 'xpub...' });

// Auto-detect any format
const wallet = createWalletFromString('xprv9s21ZrQH143K...');
```

### Send ETH

```ts
const eth = cg.connect(cg.networks.ethereum, wallet);

const amount = cg.networks.ethereum.amount('0.5');
const tx = await eth.transfer(amount, '0xRecipient...');
tx.setFee('high');

const broadcasted = await tx.signAndBroadcast();
broadcasted.onConfirmed((details) => {
  console.log('Confirmed in block', details.blockHeight);
});
```

### Send ERC-20 Tokens

```ts
const eth = cg.connect(cg.networks.ethereum, wallet);

const usdc = cg.networks.ethereum.amount('100', {
  contractAddress: '0xA0b8...eB48',
  decimals: 6,
  symbol: 'USDC',
});

const tx = await eth.transferToken(usdc, '0xRecipient...');
await tx.signAndBroadcast();
```

### Send NFTs

```ts
// ERC-721
const tx = await eth.transferNft('0xNftContract...', '0xRecipient...', tokenId);

// ERC-1155 (with quantity)
const tx = await eth.transferNft('0xNftContract...', '0xRecipient...', tokenId, 5);
```

### Connect to Any EVM Chain

```ts
const bsc = cg.networks.evmRpc({
  rpcUrl: 'https://bsc-dataseed.binance.org',
  chainId: 56,
  name: 'BNB Smart Chain',
  symbol: 'BNB',
});

const conn = cg.connect(bsc, wallet);
const balance = await conn.addressBalance();
```

### Explore Blockchain Data

```ts
const explorer = cg.explore(cg.networks.bitcoin);
const tx = await explorer.getTransactionDetails('txid...');
const block = await explorer.getBlock(800000);
const fees = await explorer.getFeeRates();

const global = cg.exploreGlobal();
const markets = await global.getMarkets();
```

### Convert to Fiat

```ts
const balance = await eth.addressBalance();
const usd = await balance.confirmed.toCurrency('usd');
console.log(`$${usd}`);
```

### Encrypt and Save a Wallet

```ts
await wallet.encrypt('my-password');
const data = wallet.serialize({ acknowledge: true });

// Restore later
import { deserializeWallet } from 'chaingate';
const restored = deserializeWallet(data, async () => {
  return prompt('Enter password:');
});
```

### Sign Messages

```ts
import { signEvmMessage, verifyEvmMessage } from 'chaingate';

// EVM (EIP-191)
const signature = signEvmMessage('Hello', privateKey);
const isValid = verifyEvmMessage('Hello', signature, address);
```

## Supported Networks

| Network | Address Types |
|---------|---------------|
| Bitcoin | segwit, legacy, taproot |
| Litecoin | segwit, legacy |
| Dogecoin | legacy |
| Bitcoin Cash | cashaddr, legacy |
| Bitcoin Testnet | segwit, legacy, taproot |
| Ethereum | EOA |
| Any EVM via RPC | EOA |

RPC proxy URLs included for Ethereum, Polygon, Arbitrum, Avalanche, BNB Chain, Base, and Sonic.

---

<p align="center">
  <a href="https://docs.chaingate.dev"><strong>📖 Read the full docs</strong></a>
</p>
