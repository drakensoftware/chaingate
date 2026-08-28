<p align="center">
  <img src="./logo.png" alt="ChainGate" height="80" />
</p>

<h1 align="center">ChainGate</h1>

<p align="center">
  <strong>The Bitcoin &amp; Ethereum SDK for TypeScript and Node.js.</strong>
  <br />
  Multi-chain wallets, balances, transaction history, fee estimation, signing, and broadcast across UTXO and EVM chains — from a single npm package.
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

## What is ChainGate?

ChainGate is a cross-platform blockchain SDK and multi-blockchain integration library for TypeScript and Node.js. It is a modern, batteries-included **bitcoinjs-lib alternative** that also covers EVM chains, so you can send Bitcoin, Ethereum, Avalanche, Litecoin, Dogecoin, Bitcoin Cash, and ERC-20/NFT transactions from a single `npm install chaingate` — no more stitching together `bitcoinjs-lib`, `ethers`, `web3.js`, and five different explorer APIs.

ChainGate offers **three levels of support**, depending on the chain:

- **Full API** — **Bitcoin, Bitcoin Testnet, Litecoin, Dogecoin, Bitcoin Cash, Ethereum, and Avalanche.** Some of the features available here include address transaction history, UTXO listings, mempool / pending transactions, real-time events, ERC-20 and NFT balance discovery, ERC-20 / ERC-721 / ERC-1155 metadata, native signing, broadcasting, fee estimation, and fiat pricing. A ChainGate-hosted RPC URL is included for every chain in this tier as well.
- **RPC-only** — **Polygon, Arbitrum, Base, BNB Chain, and Sonic** ship with ChainGate-hosted JSON-RPC URLs. You get wallet creation, native-coin balance, signing + broadcasting (native, ERC-20, NFTs, arbitrary contract calls), and EIP-1559 gas estimation.
- **Any RPC you want** — **Any other EVM chain** works by passing your own RPC URL to `cg.networks.evmRpc({ rpcUrl, chainId })` — same capabilities as the RPC-only tier above.

Use it to:

- Build a crypto wallet in JavaScript or TypeScript (Node.js or browser)
- Send crypto transactions across UTXO and EVM chains
- Check native-coin balance on every supported chain; check ERC-20 and NFT balances on Ethereum
- Pull decoded transaction history on UTXO chains and Ethereum
- Validate addresses for every supported chain (multichain address format checker)
- Convert Bitcoin (satoshi ↔ BTC) and Ethereum (wei ↔ gwei ↔ ether) units
- Derive private keys from a seed phrase (BIP-39 / BIP-32 / BIP-44 / BIP-84 / BIP-86)
- Access hosted RPC endpoints for every supported chain without running your own node — or point ChainGate at any other EVM RPC URL
- Track the current Ethereum gas price in gwei and estimate transaction fees before broadcasting
- Get notified in real time of new blocks, balance changes and incoming or pending transactions for any address

## Features

- 👛 **Multi-chain wallet SDK** — Create HD wallets from mnemonics, or import from seed, xpriv, xpub, private key, WIF, or keystores
- ⛓️ **Full API** — Balances, address transaction history, UTXOs, mempool / pending transactions, ERC-20 and NFT discovery, and fiat pricing on UTXO chains and Ethereum — with a hosted RPC URL for each one included too
- ⚡ **RPC-only (hosted)** — Ready-to-use JSON-RPC URLs for the major EVM chains. Wallets, native balance, signing + broadcasting (native, ERC-20, NFTs, contract calls), gas estimation
- 🔗 **Any RPC you want** — Same capabilities on any other EVM chain via `cg.networks.evmRpc({ rpcUrl, chainId })`
- 📍 **Address derivation** — BIP-44 / BIP-84 / BIP-86 with segwit, legacy, taproot, cashaddr, and EOA
- 🔍 **Blockchain explorer** — On UTXO chains and Ethereum: balances, transaction history, UTXOs, mempool / pending transactions, blocks, fees, ERC-20 / ERC-721 / ERC-1155 token metadata, and NFT data
- ⚡ **Real-time events** — `onBlock()`, `onBalance()`, `onTransaction()`, `onPendingTransaction()`, `onMempoolTransaction()` and `onContractInteraction()` push typed events to your callbacks on every Full API chain — one shared connection per network, automatic reconnection, no polling
- 📤 **Send crypto transactions in TypeScript** — Send native coins, ERC-20 tokens, NFTs, and call smart contracts with auto-suggested fees — on every supported chain
- 🔒 **Encryption** — AES-256-GCM wallet encryption with password protection
- ✍️ **Message signing** — EIP-191 (EVM) and Bitcoin-standard signing and verification
- 💱 **Fiat conversion** — Live ETH/USD, BTC/USD, and conversion to 160+ currencies (UTXO chains and Ethereum)
- 👁️ **View-only wallets** — Read-only access from xpub or public key
- 🔧 **Unit converters included** — Bitcoin unit converter (satoshi ↔ BTC) and Ethereum unit converter (wei ↔ gwei ↔ ether) built into the `Amount` type
- ⛽ **ETH gas tracker &amp; fee estimator** — Current Ethereum gas price in gwei, EIP-1559 `maxFeePerGas` / `maxPriorityFeePerGas`, and ready-to-use fee presets. Works on every EVM chain reachable via RPC

## Install

```bash
npm install chaingate
```

That's it — no signup, no environment variables, no setup. `new ChainGate()` works out of the box.

## Examples

### Send Bitcoin or Ethereum

A full send flow — fee estimation, signing, and broadcast — works the same way on UTXO chains and EVM chains (Ethereum with full API, plus any other EVM chain via RPC):

```ts
import { ChainGate, importWallet } from 'chaingate';

const cg = new ChainGate();
const wallet = importWallet({ phrase: 'abandon abandon abandon ...' });

// --- Bitcoin (UTXO) ---
const btc = cg.connect(cg.networks.bitcoin, wallet);
const btcAmount = await cg.networks.bitcoin.amountFromCurrency('usd', 20); // $20 in BTC
const btcTx = await btc.transfer(btcAmount, 'bc1qRecipient...');

const btcFees = btcTx.recommendedFees();
console.log(btcFees.normal.estimatedFeeSat); // fee in satoshis
console.log(btcFees.normal.enoughFunds);     // true if balance covers amount + fee
btcTx.setFee(btcFees.high);

const btcBroadcast = await btcTx.signAndBroadcast();
console.log('BTC txid:', btcBroadcast.transactionId);

// --- Ethereum (EVM) ---
const eth = cg.connect(cg.networks.ethereum, wallet);
const ethAmount = cg.networks.ethereum.amount('0.01'); // 0.01 ETH
const ethTx = await eth.transfer(ethAmount, '0xRecipient...');

const ethFees = ethTx.recommendedFees();
console.log(ethFees.normal.maxFeePerGas); // EIP-1559 fee in wei
ethTx.setFee(ethFees.high);

const ethBroadcast = await ethTx.signAndBroadcast();
console.log('ETH txHash:', ethBroadcast.transactionId);
```

### Send Litecoin, Dogecoin, or Bitcoin Cash

The same `transfer()` API covers every UTXO chain — just swap the network:

```ts
// Litecoin
const ltc = cg.connect(cg.networks.litecoin, wallet);
const ltcAmount = cg.networks.litecoin.amount('0.1'); // 0.1 LTC
await (await ltc.transfer(ltcAmount, 'ltc1q...')).signAndBroadcast();

// Dogecoin
const doge = cg.connect(cg.networks.dogecoin, wallet);
const dogeAmount = cg.networks.dogecoin.amount('100'); // 100 DOGE
await (await doge.transfer(dogeAmount, 'D...')).signAndBroadcast();

// Bitcoin Cash
const bch = cg.connect(cg.networks.bitcoincash, wallet);
const bchAmount = cg.networks.bitcoincash.amount('0.05'); // 0.05 BCH
await (await bch.transfer(bchAmount, 'bitcoincash:q...')).signAndBroadcast();
```

### Check Crypto Balance

Pull the native-coin balance for any wallet or address on any supported chain. On **UTXO chains and Ethereum** you also get the confirmed / unconfirmed split and live fiat pricing in USD, EUR, or any of 160+ currencies from the same call. On **EVM chains accessed via RPC** you get the native balance read directly from the JSON-RPC node — no fiat conversion (that needs market data, which a JSON-RPC node doesn't serve).

```ts
// Ethereum (EVM)
const eth = cg.connect(cg.networks.ethereum, wallet);
const ethBalance = await eth.addressBalance();
const ethUsd = await ethBalance.confirmed.toCurrency('usd'); // live ETH/USD
console.log(`${ethBalance.confirmed.base()} ETH ($${ethUsd})`);

// Bitcoin (UTXO)
const btc = cg.connect(cg.networks.bitcoin, wallet);
const btcBalance = await btc.addressBalance();
const btcUsd = await btcBalance.confirmed.toCurrency('usd'); // live BTC/USD
console.log(`${btcBalance.confirmed.base()} BTC ($${btcUsd})`);
```

### Create a Multi-Chain Wallet

One BIP-39 mnemonic, addresses for every supported chain:

```ts
import { ChainGate, newWallet } from 'chaingate';

const cg = new ChainGate();

const { phrase, wallet } = newWallet(); // 12-word BIP-39 mnemonic
console.log('Mnemonic:', phrase);

// Same wallet, multiple chains
const ethAddress = await cg.connect(cg.networks.ethereum, wallet).address();
const btcAddress = await cg.connect(cg.networks.bitcoin, wallet).address();

console.log({ ethAddress, btcAddress });
```

### Derive Private Keys from a Seed Phrase

BIP-32 / BIP-44 / BIP-84 / BIP-86 derivation with custom paths, for any chain:

```ts
import { importWallet } from 'chaingate';

const wallet = importWallet({ phrase: 'abandon abandon abandon ...' });

// Ethereum (BIP-44, coin type 60)
const eth = await wallet.derive("m/44'/60'/0'/0/5");
console.log(eth.privateKey.hex); // derived ETH private key as hex

// Bitcoin SegWit (BIP-84, coin type 0)
const btc = await wallet.derive("m/84'/0'/0'/0/0");
console.log(btc.privateKey.hex); // derived BTC private key
console.log(btc.xpriv);          // extended private key
```

### Token Balances (ERC-20, ERC-721, ERC-1155) — Ethereum only

Every ERC-20 holding and every NFT owned by an Ethereum address, returned in one request — contract metadata, symbols, decimals, and token counts arrive pre-decoded. Token / NFT balance discovery is Ethereum-only among the EVM chains; a plain JSON-RPC endpoint cannot answer this query, so `addressTokenBalances()` is not available on EVM chains accessed via RPC.

```ts
const eth = cg.connect(cg.networks.ethereum, wallet);

const tokens = await eth.addressTokenBalances();

for (const token of tokens) {
  if (token.isNFT) {
    console.log(`${token.name} -- ${token.ownedTokens.length} NFTs`);
  } else {
    console.log(`${token.base()} ${token.symbol}`); // e.g. "1500.50 USDC"
  }
}
```

### Check a Token Before Buying (ERC-20 Metadata)

Confirm a contract's `name`, `symbol`, and `decimals` before approving or swapping — a simple safety check before buying any ERC-20:

```ts
const explorer = cg.explore(cg.networks.ethereum);
const info = await explorer.getTokenData('0xA0b8...eB48');

console.log(info.name);     // "USD Coin"
console.log(info.symbol);   // "USDC"
console.log(info.decimals); // 6
console.log(info.standard); // "ERC20"
```

### Transaction History & Pending Mempool Transactions

Pull transaction history for any address on UTXO chains (Bitcoin, Litecoin, Dogecoin, Bitcoin Cash) and Ethereum. On Ethereum, every transaction arrives with decoded actions — token transfers, approvals, wraps, unwraps, mints, burns, and internal calls pre-classified by type. On UTXO chains you can also peek at unconfirmed activity sitting in the mempool. Address history is not available on EVM chains accessed via RPC — a JSON-RPC node cannot answer those queries.

```ts
// Ethereum — decoded actions per transaction
const eth = cg.connect(cg.networks.ethereum, wallet);
const ethHistory = await eth.addressHistory();

for (const tx of ethHistory.transactions) {
  console.log(tx.txHash, new Date(tx.timestamp * 1000));

  // Decoded actions relevant to your address
  for (const action of tx.actions) {
    // action.type: "transfer_in", "transfer_out", "mint", "burn", "wrap", "unwrap", ...
    // action.token: { name, symbol, decimals, logoUrl }
    // action.contract: contract address or "native" for ETH transfers
    console.log(`  ${action.type} on ${action.token.symbol ?? 'ETH'}`);
  }
}

// UTXO — confirmed transactions with fiat conversion
const btc = cg.connect(cg.networks.bitcoin, wallet);
const btcHistory = await btc.addressHistory();

for (const tx of btcHistory.transactions) {
  const usd = await tx.amount.toCurrency('usd');
  console.log(`${tx.txid}: ${tx.amount.base()} BTC ($${usd})`);
}

// Unconfirmed / pending transactions from the mempool (UTXO chains)
const btcExplorer = cg.explore(cg.networks.bitcoin);
const mempool = await btcExplorer.getMempool();
console.log(`${mempool.transactions.length} pending transactions in the mempool`);
```

### Real-Time Events — Blocks, Balances & Transactions over WebSocket

Stop polling. Subscribe with a callback and ChainGate pushes new blocks, balance changes, transactions and pending activity to you — on Bitcoin, Litecoin, Dogecoin, Bitcoin Cash, Bitcoin Testnet, Ethereum and Avalanche. The connection is opened, shared, kept alive and reconnected for you; every event is a typed object with `Amount` values.

```ts
const btc = cg.explore(cg.networks.bitcoin);

// Every new block
btc.onBlock((block) => console.log(`Block ${block.height} — ${block.numTxs} txs`));

// Balance of any address, after every block that changes it
btc.onBalance('bc1q...', async ({ confirmed }) => {
  console.log(confirmed.base(), 'BTC ≈', await confirmed.toCurrency('usd'), 'USD');
});

// Or follow your own wallet — the address is derived for you
const wallet = cg.connect(cg.networks.ethereum, myWallet);
const sub = wallet.onTransaction(({ height }) => console.log('Activity in block', height));
await sub.ready;      // confirmed by the server
sub.unsubscribe();    // done — the last subscription closes the connection

// Also: onFullBlock, onPendingBalance, onPendingTransaction, onMempoolTransaction,
// onContractInteraction (EVM), and onError for connection errors.
```

Transaction confirmations use the same events: `broadcasted.onConfirmed()` fires as soon as the block that includes your transaction is finalized.

### Import a Wallet

Restore an existing wallet from any common format — mnemonic seed phrase, raw private key, xpub for view-only access, WIF, or an extended key — with auto-detection for arbitrary strings:

```ts
import { importWallet, createWalletFromString } from 'chaingate';

// From mnemonic (seed phrase)
const wallet = importWallet({ phrase: 'abandon abandon abandon ...' });

// From private key
importWallet({ privateKey: '0x...' });

// From xpub (view-only)
importWallet({ xpub: 'xpub...' });

// Auto-detect any format
const wallet = createWalletFromString('xprv9s21ZrQH143K...');
```

### Send ERC-20 Tokens

Transfer USDC, USDT, DAI, or any ERC-20 token by contract address. Gas estimation, nonce handling, and the `transfer()` ABI call are done for you:

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

Move an ERC-721 or ERC-1155 token between Ethereum addresses with one call — no manual ABI encoding, no contract wiring:

```ts
// ERC-721
const tx = await eth.transferNft('0xNftContract...', '0xRecipient...', tokenId);

// ERC-1155 (with quantity)
const tx = await eth.transferErc1155('0xNftContract...', tokenId, 5, '0xRecipient...');
```

### Connect to Any EVM Chain (RPC-only)

ChainGate ships with free, ready-to-use JSON-RPC URLs for the major EVM chains — drop them into `ethers`, `viem`, `web3.js`, or into ChainGate's built-in `evmRpc()` connector. No separate Alchemy / Infura / archive-node subscription required.

On EVM chains accessed via RPC, ChainGate can derive addresses, read native-coin balance, estimate gas, and sign + broadcast every kind of transaction (native transfer, ERC-20, ERC-721 / ERC-1155 NFTs, arbitrary contract calls). **Not available:** address transaction history and token / NFT balance discovery — those queries aren't part of the JSON-RPC interface.

```ts
const cg = new ChainGate();

// Pre-built ChainGate RPC URLs (signing, broadcasting, gas, native balance;
// no address history or token discovery through a JSON-RPC endpoint)
cg.rpcUrls.ethereum;   // Ethereum   (also via cg.networks.ethereum for full features)
cg.rpcUrls.avalanche;  // Avalanche  (also via cg.networks.avalanche for full features)
cg.rpcUrls.polygon;    // Polygon
cg.rpcUrls.arbitrum;   // Arbitrum
cg.rpcUrls.base;       // Base
cg.rpcUrls.bnb;        // BNB Smart Chain
cg.rpcUrls.sonic;      // Sonic

// Use a curated URL with the evmRpc connector
const bsc = cg.networks.evmRpc({
  rpcUrl: cg.rpcUrls.bnb,
  chainId: 56,
  name: 'BNB Smart Chain',
  symbol: 'BNB',
});

// Or point evmRpc at ANY JSON-RPC endpoint — your own node, a public RPC,
// any EVM mainnet or testnet
const customChain = cg.networks.evmRpc({
  rpcUrl: 'https://your-rpc-url',   // any EVM JSON-RPC URL works
  chainId: 1,
  name: 'My Chain',
  symbol: 'TOKEN',
});

const conn = cg.connect(customChain, wallet);
const { balance } = await conn.addressBalance();                            // native balance
const tx = await conn.transfer(customChain.amount('1'), '0xRecipient...');  // sign + broadcast
await tx.signAndBroadcast();
// conn.addressHistory() and conn.addressTokenBalances() are not exposed on
// the RPC-only connector — a JSON-RPC node cannot answer those queries.
```

### Encrypt and Save a Wallet

Encrypt a wallet with a user-supplied password (AES-256-GCM) and serialize it to a string you can persist anywhere — localStorage, IndexedDB, a file, or your own backend — then decrypt it on demand:

```ts
await wallet.encrypt('my-password');
const data = wallet.serialize();

// Restore later
import { deserializeWallet } from 'chaingate';
const restored = deserializeWallet(data, async () => {
  return prompt('Enter password:');
});
```

### Multichain Address Format Checker / Ethereum Address Validator

Validate addresses for every supported chain with a single API — a drop-in Ethereum address validator *and* multichain address format checker:

```ts
cg.networks.ethereum.isValidAddress('0xAb5801a7D398351b8bE11C439e05C5B3259aeC9B');    // true
cg.networks.bitcoin.isValidAddress('bc1qw508d6qejxtdg4y5r3zarvary0c5xw7kv8f3t4');     // true
cg.networks.litecoin.isValidAddress('ltc1qw508d6qejxtdg4y5r3zarvary0c5xw7kv8f3t4');   // true
cg.networks.dogecoin.isValidAddress('DQA5APpAJi2f1YVfKjSgf1fzS8RvMgQrM3');             // true
cg.networks.bitcoincash.isValidAddress('bitcoincash:qpm2qsznhks23z7629mms6s4cwef74vcwvy22gdx6a'); // true

cg.networks.bitcoin.isValidAddress('0xAb5801a7D398351b8bE11C439e05C5B3259aeC9B');      // false
cg.networks.ethereum.isValidAddress('not-an-address');                                 // false
```

### Ethereum &amp; Bitcoin Unit Converter

Every `Amount` carries both its smallest unit (wei, satoshi) and its decimal form — no more `BigNumber.from(10).pow(18)` boilerplate:

```ts
const eth = cg.networks.ethereum.amount('1.5'); // 1.5 ETH
console.log(eth.base()); // 1.5
console.log(eth.min());  // 1500000000000000000n (wei)

const btc = cg.networks.bitcoin.amount('0.01'); // 0.01 BTC
console.log(btc.base()); // 0.01
console.log(btc.min());  // 1000000n (satoshi)

// Live ETH/USD, BTC/USD, and 160+ other fiat currencies
console.log(await eth.toCurrency('usd')); // current ETH USD value
console.log(await btc.toCurrency('eur'));
```

### Sign Messages

Sign and verify messages with EIP-191 `personal_sign` on EVM chains, or Bitcoin-standard message signing on UTXO chains:

```ts
import { signEvmMessage, verifyEvmMessage } from 'chaingate';

// EVM (EIP-191)
const signature = signEvmMessage('Hello', privateKey);
const isValid = verifyEvmMessage('Hello', signature, address);
```

### ETH Gas Tracker — Current Ethereum Gas Price in Gwei

Pull the current Ethereum gas price with EIP-1559 parameters straight from the SDK — no scraping required. `maxFeePerGas` and `maxPriorityFeePerGas` are returned as `bigint` wei values; divide by 1e9 for gwei:

```ts
const eth = cg.connect(cg.networks.ethereum, wallet);

// Get current ETH gas price + EIP-1559 fee rates
const tx = await eth.transfer(amount, '0xRecipient...');
const fees = tx.recommendedFees();

const toGwei = (wei: bigint) => Number(wei) / 1e9;

console.log(`Current ETH gas price: ${toGwei(fees.normal.maxFeePerGas)} gwei`);
console.log(`Priority tip:          ${toGwei(fees.normal.maxPriorityFeePerGas)} gwei`);
console.log(`Expected confirmation: ~${fees.normal.estimatedConfirmationSecs}s`);
console.log(`Enough funds:          ${fees.normal.enoughFunds}`);
```

### Ethereum Gas Fees Calculator — Estimate Transaction Fees

Compare every fee tier before broadcasting — a lightweight Ethereum gas fees calculator built into every transaction. Four tiers are returned: `low`, `normal`, `high`, and `maximum`:

```ts
const tx = await eth.transferToken(usdc, '0xRecipient...');
const fees = tx.recommendedFees();

const toGwei = (wei: bigint) => Number(wei) / 1e9;

console.table({
  low:     { gwei: toGwei(fees.low.maxFeePerGas),     sec: fees.low.estimatedConfirmationSecs },
  normal:  { gwei: toGwei(fees.normal.maxFeePerGas),  sec: fees.normal.estimatedConfirmationSecs },
  high:    { gwei: toGwei(fees.high.maxFeePerGas),    sec: fees.high.estimatedConfirmationSecs },
  maximum: { gwei: toGwei(fees.maximum.maxFeePerGas), sec: fees.maximum.estimatedConfirmationSecs },
});

tx.setFee(fees.normal); // pick whichever tier you prefer
```

### Polygon Gas Station & Multi-chain Gas Prices

The same `recommendedFees()` API works on every EVM chain reachable via RPC. Here it is on Polygon:

```ts
const polygon = cg.networks.evmRpc({
  rpcUrl: cg.rpcUrls.polygon,
  chainId: 137,
  name: 'Polygon',
  symbol: 'POL',
});

const pol = cg.connect(polygon, wallet);
const tx = await pol.transfer(amount, '0xRecipient...');
const fees = tx.recommendedFees();

const gwei = Number(fees.normal.maxFeePerGas) / 1e9;
console.log(`Polygon gas price: ${gwei} gwei`);
```

Run the same pattern on every chain to compare `maxFeePerGas × gasLimit` and pick the cheapest one for each transfer.

## Supported Networks

### Full API support

Everything the SDK offers: address transaction history, UTXO listings, mempool / pending transactions, ERC-20 / ERC-721 / ERC-1155 discovery and metadata, fiat pricing, fee estimation, signing, and broadcasting — plus a ChainGate-hosted JSON-RPC URL for direct node access.

| Network         | Address Types           | RPC URL                     |
| --------------- | ----------------------- | --------------------------- |
| Bitcoin         | segwit, legacy, taproot | `cg.rpcUrls.bitcoin`        |
| Bitcoin Testnet | segwit, legacy, taproot | `cg.rpcUrls.bitcoinTestnet` |
| Litecoin        | segwit, legacy          | `cg.rpcUrls.litecoin`       |
| Dogecoin        | legacy                  | `cg.rpcUrls.dogecoin`       |
| Bitcoin Cash    | cashaddr, legacy        | `cg.rpcUrls.bitcoincash`    |
| Ethereum        | EOA                     | `cg.rpcUrls.ethereum`       |
| Avalanche       | EOA                     | `cg.rpcUrls.avalanche`      |

### RPC-only (hosted)

Wallets, native-coin balance, signing, broadcasting (native, ERC-20, NFTs, arbitrary contract calls), and EIP-1559 gas estimation via a ChainGate-hosted JSON-RPC endpoint. **Not available:** address transaction history and token / NFT balance discovery — these aren't part of the JSON-RPC spec.

| Network   | Address Types | RPC URL                |
| --------- | ------------- | ---------------------- |
| Polygon   | EOA           | `cg.rpcUrls.polygon`   |
| Arbitrum  | EOA           | `cg.rpcUrls.arbitrum`  |
| Base      | EOA           | `cg.rpcUrls.base`      |
| BNB Chain | EOA           | `cg.rpcUrls.bnb`       |
| Sonic     | EOA           | `cg.rpcUrls.sonic`     |

### Any RPC you want

Same capabilities as the hosted tier, on any other EVM chain — Optimism, Linea, Scroll, Gnosis, a testnet, your own node, anything EVM-compatible — by passing the JSON-RPC URL to `cg.networks.evmRpc({ rpcUrl, chainId, name, symbol })`.

Free ChainGate-hosted RPC proxy URLs are included for every curated chain above — a drop-in alternative to hosting your own node.

## API Key (optional, free)

ChainGate works **without an API key** out of the box — no signup, no setup, just `new ChainGate()` and you're querying the network. Every example above runs unchanged on the keyless tier.

The keyless tier is rate-limited per IP, so once you start hammering endpoints from a real app you'll eventually hit a `RateLimitError`:

```ts
// ChainGate rate limit reached on the keyless tier. Get a free API key at
// https://api.chaingate.dev and pass it as `new ChainGate({ apiKey })` to raise
// your quota.
```

When that happens, grab a **free API key** at [api.chaingate.dev](https://api.chaingate.dev) and pass it once at construction:

```ts
const cg = new ChainGate({ apiKey: 'your-api-key' });
```

Everything else stays the same — the API key only raises the quota.

## FAQ

### Which networks does ChainGate support?

ChainGate offers **three levels** of support:

- **Full API** — Bitcoin, Bitcoin Testnet, Litecoin, Dogecoin, Bitcoin Cash, Ethereum, and Avalanche, with native + ERC-20 / NFT balances, address transaction history, UTXO and mempool data, explorer endpoints, fiat pricing, fee estimation, signing, broadcasting, and a hosted JSON-RPC URL per chain.
- **RPC-only (hosted)** — Polygon, Arbitrum, Base, BNB Chain, and Sonic ship with first-party ChainGate JSON-RPC URLs. Wallets, native-coin balance, signing + broadcasting (native / ERC-20 / NFTs / contract calls), gas estimation — no address transaction history or token / NFT balance discovery.
- **Any RPC you want** — Any other EVM chain (Optimism, Linea, Scroll, Gnosis, testnets, your own node, …) works through `cg.networks.evmRpc({ rpcUrl, chainId })` — you bring the JSON-RPC endpoint, same capabilities as the hosted tier.

### Can I get real-time events instead of polling?

Yes. On every Full API chain, `cg.explore(network)` and `cg.connect(network, wallet)` expose `onBlock()`, `onBalance()`, `onTransaction()`, `onPendingBalance()`, `onPendingTransaction()`, `onMempoolTransaction()` and — on Ethereum and Avalanche — `onContractInteraction()`. Each returns a subscription with `ready`, `address` and `unsubscribe()`; one WebSocket connection per network is shared by all of them and reconnected automatically. Events are included with the free API key and work without one too.

### Can I use ChainGate in the browser?

Yes. The package ships as ESM + CJS and uses browser-compatible crypto. It works in modern browsers, Node.js ≥ 22, and Bun. Signing always happens client-side.

### Is my private key or seed phrase ever sent to ChainGate servers?

No. Wallet construction, key derivation, and signing run locally. ChainGate's backend only proxies JSON-RPC requests and broadcasts already-signed raw transactions.

### How do I get the current gas price in gwei for a transaction?

Build the transaction with `transfer()` or `transferToken()`, then call `tx.recommendedFees()`. You get four tiers (`low`, `normal`, `high`, `maximum`) with `maxFeePerGas` and `maxPriorityFeePerGas` as `bigint` wei values. Divide by `1e9` for gwei, multiply by `gasLimit` for the total fee in ETH.

### How does ChainGate compare to ethers.js, web3.js, or bitcoinjs-lib?

`ethers` and `web3.js` cover EVM only; `bitcoinjs-lib` covers Bitcoin only. ChainGate covers both — plus every major UTXO chain with full feature support, and every EVM chain reachable by a JSON-RPC URL — behind one consistent API. Signing, broadcasting, and fee estimation work everywhere; UTXO handling, decoded transaction history, token / NFT discovery, and fiat conversion are available on UTXO chains and Ethereum.

### Can I point ChainGate at my own RPC node?

Yes. `cg.networks.evmRpc({ rpcUrl, chainId, name, symbol })` accepts any JSON-RPC URL — your own node, Alchemy, Infura, QuickNode, a public RPC, or ChainGate's proxy — and returns the same `transfer()`, `recommendedFees()`, and balance APIs.

### Which chain should I use to minimize transaction fees?

Gas prices change block by block, so the answer shifts throughout the day. L2s (Arbitrum, Base, Optimism, Linea, Scroll) and alt-L1s (Polygon, Avalanche, BNB, Sonic, Celo) are usually far cheaper than Ethereum mainnet. Since `recommendedFees()` works everywhere, you can compare `maxFeePerGas × gasLimit` across chains at runtime and route the transfer to whichever is cheapest.

---

<p align="center">
  <a href="https://docs.chaingate.dev"><strong>📖 Read the full docs</strong></a>
</p>
