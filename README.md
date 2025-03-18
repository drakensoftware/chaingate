# 🔗 ChainGate

<p align="center">A complete cryptocurrency Typescript framework for connecting to and making transactions on different blockchains.</p>

<p align="center"><strong>Bitcoin • Ethereum • Bnb • Dogecoin • Avalanche • Litecoin • Bitcoin Cash • Polygon • Arbitrum • Fantom • Base • Bitcoin Testnet</strong></p>

<p align="center">
    <img src="https://img.shields.io/github/package-json/v/drakensoftware/chaingate" alt="Version" />
    <img src="https://img.shields.io/github/actions/workflow/status/drakensoftware/chaingate/test.yml?label=Test&branch=main" alt="Test" />
    <img src="https://img.shields.io/github/actions/workflow/status/drakensoftware/chaingate/build.yml?label=Build&branch=main" alt="Build" />
    <img src="https://img.shields.io/github/actions/workflow/status/drakensoftware/chaingate/build-web.yml?label=Build%20Web&branch=main" alt="Build Web" />
</p>

![banner.png](banner.png)

## Installation

```bash
npm i chaingate
```

Get your API key now for free at [https://chaingate.dev](https://chaingate.dev)

## Features

- 💻❤️🌐 **NodeJS & Browser** compatible
- 🔌 **Plug and Play Wallet**:
  - 🆕 **Create** new wallet from mnemonic (BIP39 phrase)
  - 📥 **Import** any wallet:
    - 📜 BIP39 (mnemonic)
    - 🔑 Private keys (hex string or `Uint8Array`)
    - 🌱 Seeds (raw format)
    - 🔐 Ethereum-like or DEX-like keystores
  - 🗺️ **HD Wallet** support (BIP32 derivation paths)
- 🔗 **Multi-Chain Functionality**:
  - 🔄 Access multiple blockchains with the same library
  - 💱 Retrieve balances (BTC, ETH, BNB, etc.)
  - 📡 Create and broadcast transactions
  - 📏 Get blockchain info (block height, transaction details, etc.)
- 🔮 **Fee Estimation / Gas Prediction**: Accurately predict fees for transactions

> **Warning**  
> Use of this blockchain library is at your own risk. There are no warranties or liabilities assumed, and data accuracy is not guaranteed.

# Table of Contents

1. [🔗 ChainGate](#chaingate)  
   1.1. [Installation](#installation)  
   1.2. [Features](#features)

2. [Create or import a wallet](#create-or-import-a-wallet)  
   2.1. [Wallet creation](#wallet-creation)  
   2.2. [Import a wallet](#import-a-wallet)  
   2.3. [Encryption](#encryption)  
   2.4. [Keys and exporting](#keys-and-exporting)  
   2.4.1. [Accessing phrase, seed, or private keys](#accessing-phrase-seed-or-private-keys)  
   2.4.2. [Export wallet](#export-wallet)
   2.5. [Addresses](#addresses)  
   2.5.1. [Generate Addresses](#1-generate-addresses)  
   2.5.2. [Check Balances](#2-check-balances)  
   2.5.3. [Send Transactions](#3-send-transactions)  
   2.6. [Derivation paths](#derivation-paths)

3. [Query RPCs](#query-rpcs)  
   3.1. [Usage with Web3.js](#usage-with-web3js)  
   3.2. [Usage with ethers.js](#usage-with-ethersjs)

4. [Query the API directly](#query-the-api-directly)

5. [Blockchain data](#blockchain-data)

6. [Why am I receiving the message "You have exhausted your API tier limit..."](#why-am-i-receiving-the-message-you-have-exhausted-your-api-tier-limit)

7. [I can't build my web app: "webpack < 5 used to include polyfills for node.js core modules by default"](#i-cant-build-my-web-app-webpack--5-used-to-include-polyfills-for-nodejs-core-modules-by-default)  
   7.1. [What's happening?](#whats-happening)  
   7.2. [Why does ChainGate need polyfills?](#why-does-chaingate-need-polyfills)  
   7.3. [How to fix](#how-to-fix)

# Create or import a wallet

## Wallet creation

Create a new wallet by calling:

```typescript
import { initializeWallet } from 'chaingate'

const { wallet, phrase } = await initializeWallet.create({
  apiKey: '1234-5678'
})
```

- `wallet` is a fully initialized wallet instance.
- `phrase` is the generated mnemonic (BIP39) for backup.

## Import a wallet

You can also import an existing wallet created with other software or libraries:

```typescript
import { initializeWallet } from 'chaingate'

// 1. Initialize wallet from keystore (JSON + password)
const keystore = '{"cipher":"aes-128-ctr","ciphertext":"..."}'
const { wallet: walletFromKeystore } = await initializeWallet.fromKeystore({
  apiKey: '1234-5678',
  keystore,
  password: 'password'
})

// 2. Initialize wallet from mnemonic (BIP39)
const phrase = 'abandon abandon about ...'
const { wallet: walletFromPhrase } = await initializeWallet.fromPhrase({
  apiKey: '1234-5678',
  phrase
})

// 3. Initialize wallet from seed
const { wallet: walletFromSeedHex } = await initializeWallet.fromSeed({
  apiKey: '1234-5678',
  seed: '0x75a993774...'
})
const { wallet: walletFromSeedUint } = await initializeWallet.fromSeed({
  apiKey: '1234-5678',
  seed: new Uint8Array([0x01, 0x02, 0x03])
})

// 4. Initialize wallet from private key
const { wallet: walletFromPkHex } = await initializeWallet.fromPrivateKey({
  apiKey: '1234-5678',
  privateKey: '6b53aa40...'
})
const { wallet: walletFromPkUint } = await initializeWallet.fromPrivateKey({
  apiKey: '1234-5678',
  privateKey: new Uint8Array([0xab, 0xcd, 0xed])
})

// 5. Initialize wallet from serialization
const { wallet: walletFromSerialization } = await initializeWallet.fromPrivateKey({
    apiKey: '1234-5678',
    serialized: '{...}',
    askForPassword: async (attempts, reject) => {
        // Implement an interactive password prompt or any input flow
        return prompt('Enter wallet password:')
    }
})

```

## Encryption

You can optionally encrypt the wallet with a password at initialization:

```typescript
import { initializeWallet } from 'chaingate'

const { wallet } = await initializeWallet.fromPhrase({
  phrase: 'abandon abandon about ...',
  encrypt: {
    password: 'your-strong-password',
      askForPassword: async (attempts, reject) => {
      // Implement an interactive password prompt or any input flow
      return prompt('Enter wallet password:')
    }
  }
})

// Future transactions or sensitive operations automatically prompt for the password
```

**Notes**:
- Encrypted wallets require `askForPassword` to decrypt private data during sensitive operations.
- Use `warnAboutUnencrypted: false` to disable warnings in secure environments.

## Keys and exporting

After creating or importing a wallet, you can access and export its keys.

### Accessing phrase, seed, or private keys

```typescript
import { initializeWallet } from 'chaingate'

const { wallet } = await initializeWallet.create({
  apiKey: '1234-5678'
})

// Export phrase (mnemonic)
const phrase: string = await wallet.getPhrase()

// Export seed in hex format
const seedHex: string = (await wallet.getSeed()).hexa

// Use a wallet from a private key
const { wallet: wallet2 } = await initializeWallet.fromPrivateKey({
  apiKey: '1234-5678',
  privateKey: '6b53aa40...'
})

// Export private key in various formats
const privateKeyRaw: Uint8Array = (await wallet2.getPrivateKey()).raw
const privateKeyHex: string = (await wallet2.getPrivateKey()).hexa
const privateKeyWIF: string = (await wallet2.getPrivateKey()).wif

// Export public key
const publicKey = await wallet2.getPublicKey()
const publicKeyHex = publicKey.hex
```

### Export wallet (serialization)

You can export wallet for backup or restoration:

```typescript
const serializedWallet = await wallet.serialize()
```

## Addresses

### 1. Generate Addresses

```typescript
// Bitcoin (default: Native SegWit)
const btcCurrency = wallet.currency('bitcoin')
console.log(await btcCurrency.getAddress())
// e.g. bc1qcu2aq327lzgee5f9vqm7m23fhck39ja7j37ass

// Ethereum
const ethCurrency = wallet.currency('ethereum')
console.log(await ethCurrency.getAddress())
// e.g. 0xE7c19D5A90352b5eE0144363D1191E2549Ca2146

// Custom Derivation Path (e.g., Bitcoin Taproot)
btcCurrency.setDerivationPath("m/86'/0'/0'/0/0")
console.log(await btcCurrency.getAddress('taproot'))
// e.g. bc1ps6lm9t9yx6etly4y06hvqwyyzk4pc0j02w58s2frsgxlsh5hv47qvermj7
```

### 2. Check Balances

```typescript
// Bitcoin
const bitcoinBalance = await btcCurrency.getBalance()
console.log(bitcoinBalance.confirmed.baseAmount.toString()) // "0.00020739"

// Ethereum
const ethBalance = await ethCurrency.getBalance()
console.log(ethBalance.confirmed.baseAmount.toString()) // "0.005"
```

### 3. Send Transactions

```typescript
// Bitcoin Transfer
const transfer = await btcCurrency.createTransfer(
  'bc1qv5r9mr7ajz2jh04d87c4nnhfjj0jqhm3z5v0hx',
  await btcCurrency.amount('0.000005', 'btc')
)

const fees = await transfer.getSuggestedFees()
if (fees.normal.enoughFunds) {
  const broadcasted = await transfer.broadcast('normal')
  console.log(broadcasted.txId)
  // e.g. "98f04fb1e708cc18525e49ad05b4d6055496a86f231b04bc132f2fd712d1f488"
}

// Ethereum Transfer
const ethTransfer = await ethCurrency.createTransfer(
  '0x1853be2c350EB9588bdC2Af73bDAA0C4B8Ac3583',
  await ethCurrency.amount('0.003', 'eth')
)

// ... check fees, broadcast similarly
```

## Derivation paths

When importing with a phrase or seed, you can specify different derivation paths for any currency. By default, ChainGate uses a recommended path for each chain.

```typescript
const { wallet } = await initializeWallet.create({ apiKey: '1234-5678' })

// Default derivation path
const addressDefault = await wallet.currency('bitcoin').getAddress()

// Change derivation path
wallet.currency('bitcoin').setDerivationPath("m/44'/0'/0'/1/3")
const customAddress = await wallet.currency('bitcoin').getAddress()
```

---

# Query RPCs

If you are using libraries such as **Web3.js** or **ethers**, or you need lower-level RPC access not directly covered by ChainGate’s higher-level functions, you can utilize ChainGate’s reliable RPC endpoints.

Examples of supported blockchains:

- Bitcoin
- Ethereum
- Bnb
- Dogecoin
- Avalanche
- Litecoin
- ... and more

### Usage with Web3.js

```typescript
import Web3 from 'web3'

const apiKey = '1234-5678'
const web3 = new Web3(`https://api.chaingate.dev/rpc/bnb?api_key=${apiKey}`)

const latestBlock = await web3.eth.getBlock('latest')
console.log(latestBlock)
```

### Usage with ethers.js

```typescript
import { JsonRpcProvider } from 'ethers'

const apiKey = '1234-5678'
const provider = new JsonRpcProvider(`https://api.chaingate.dev/rpc/bnb?api_key=${apiKey}`)

const latestBlock = await provider.getBlock('latest')
console.log(latestBlock)
```

---

# Query the API directly

You can also call the ChainGate API endpoints directly (bypassing the SDK) if you need lower-level control. For example, using `fetch` or `axios`:

```typescript
import axios from 'axios'

const apiKey = '1234-5678'
const response = await axios.get('https://api.chaingate.dev/balance', {
  params: {
    currency: 'bitcoin',
    address: 'bc1qcu2aq327lzgee5f9vqm7m23fhck39ja7j37ass'
  },
  headers: {
    'X-API-KEY': apiKey
  }
})

console.log(response.data)
```

Consult the [ChainGate API Documentation](https://api.chaingate.dev/docs) for available endpoints, parameters, and detailed examples.

---

# Blockchain data

ChainGate offers additional blockchain data endpoints, such as:

- Transaction details
- Latest blocks
- Block transactions

... and more. You can access them via the `BlockchainData` class:

```typescript
import { BlockchainData } from 'chaingate'

const blockchainData = new BlockchainData('1234-5678')

// Get transaction details (Bitcoin example)
const txDetails = (await blockchainData.BitcoinApi.transactionDetails('e9a66845...')).data
console.log(txDetails)

// Get the latest Ethereum block
const ethLatestBlock = (await blockchainData.EthereumApi.latestBlock()).data
console.log(ethLatestBlock)
```

For a full list of methods, see the [ChainGate API Documentation](https://api.chaingate.dev/docs).

---

# Why am I receiving the message "You have exhausted your API tier limit..."

ChainGate provides different usage tiers (e.g., number of requests per day). If you exceed the free or paid tier limit, you will see this message. To continue using the service, either:

1. Wait for your limit to reset at the specified interval, or
2. [Upgrade your plan](https://chaingate.dev) to a higher tier.

---

# I can't build my web app: "webpack < 5 used to include polyfills for node.js core modules by default"

### What's happening?

Older versions of Webpack (below 5) automatically included polyfills for certain Node.js core modules, making them work in a browser environment. Webpack 5 no longer does this by default, so you may encounter errors if your code or dependencies rely on Node.js modules.

### Why does ChainGate need polyfills?

ChainGate uses some Node.js-based libraries. Polyfills are necessary to provide a browser-compatible version of those APIs.

### How to fix

Use the `node-polyfill-webpack-plugin` in your project:

1. **Install the plugin**:

   ```bash
   npm install node-polyfill-webpack-plugin
   ```

2. **Update `webpack.config.js`**:

   ```js
   const NodePolyfillPlugin = require('node-polyfill-webpack-plugin');
       
   module.exports = {
     // ... your existing configuration ...
     plugins: [
       new NodePolyfillPlugin()
     ],
   };
   ```

This plugin adds the missing Node.js core module polyfills, ensuring ChainGate can run in a browser environment without errors.

---

_Thanks for using ChainGate!_
