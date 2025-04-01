# 🔗 ChainGate

<p align="center">
A comprehensive TypeScript cryptocurrency framework for connecting to and executing transactions on multiple blockchains. 
Your private keys remain securely on your device, and all transaction signing is handled offline to ensure the highest level of security.
</p>

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


<p align="center">
  <h2>👉 <a href="https://docs.chaingate.dev" target="_blank">Full documentation (docs.chaingate.dev)</a> 👈</h2>
</p>

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

# Basic Example

```typescript
import { initializeWallet } from 'chaingate'

// Create a new wallet
const { wallet, phrase } = await initializeWallet.create({
  apiKey: 'YOUR_API_KEY'
})

// Access Bitcoin functionality
const bitcoin = wallet.currency('bitcoin')
console.log('BTC Address:', await bitcoin.getAddress())

// Check balance
const balance = await bitcoin.getBalance()
console.log('Balance:', balance.confirmed.baseAmount.str)

// Example transaction (see docs for full implementation)
const recipient = 'bc1q...'
const amount = await bitcoin.amount('0.001', 'btc')
const transfer = await bitcoin.createTransfer(recipient, amount)
const fees = await transfer.getSuggestedFees()

if (fees.normal.enoughFunds) {
  const txId = await transfer.broadcast('normal')
  console.log('Transaction ID:', txId)
}
```

---

_For advanced usage, multichain operations, and API reference, visit the official documentation at **[docs.chaingate.dev](https://docs.chaingate.dev)**._
