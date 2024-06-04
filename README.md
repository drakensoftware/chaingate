# 🔗 ChainGate
A complete cryptocurrency TypeScript framework for connecting to and making transactions on different blockchains

**<p align="center">Bitcoin • Bitcoin testnet • Ethereum</p>**


![banner.png](banner.png)

Install ChainGate by executing `npm i chaingate`

Get your API key now for free on https://chaingate.dev

- 💻❤️🌐 NodeJS & Browser
- 🔌 **Plug and Play wallet:**
    - 🆕 Create new wallet from phrase
    - 📥 Import any wallet: BIP39, private keys, seeds
    - 🗺️ HDWallets: Supports BIP32 derivation paths
    - 📜 Import wallet from phrase (BIP39)
    - 🌱 Raw format seeds
    - 🔐 Keystores: Ethereum-like keystore, DEX-like keystores
- 🔗 Cross-Chain Functionality
- 🔄 Access to a wide range of blockchain RPCs
- 💱 Balance Querying: Retrieve balances across any currency
- 📡 Easy transaction creation and broadcasting
- 📏 Blockchain Information: Block height, status, transaction details
- 🔮 Gas station: Predict accurately the fees of a transaction


⚠️ USE OF THIS BLOCKCHAIN LIBRARY IS AT YOUR OWN RISK; NO WARRANTIES OR LIABILITIES ARE ASSUMED, AND DATA ACCURACY IS NOT GUARANTEED


---


- [Create or import a wallet](#create-or-import-a-wallet)
    - [Wallet creation](#wallet-creation)
    - [Import a wallet](#import-a-wallet)
    - [Keys and exporting](#keys-and-exporting)
    - [Addresses](#addresses)
    - [Derivation paths](#derivation-paths)
- [Query balances](#query-balances)
- [Create and broadcast a transaction](#create-and-broadcast-a-transaction)
- [Query RPCs](#query-rpcs)
- [Query the API directly](#query-the-api-directly)
- [Why am I receiving the message "You are running with a wallet unencrypted..."](#why-am-i-receiving-the-message-you-are-running-with-an-unencrypted-wallet)
- [Why I am receiving the message "You have exhausted your API tier limit..."](#why-i-am-receiving-the-message-you-have-exhausted-your-api-tier-limit)
- [I can't build my web app: "webpack < 5 used to include polyfills for node.js core modules by default"](#i-cant-build-my-web-app-webpack--5-used-to-include-polyfills-for-nodejs-core-modules-by-default)


# Create or import a wallet

## Wallet creation

You can create a new wallet by calling:

```typescript
import {InitializeWallet} from 'chaingate'
const wallet = await InitializeWallet.create('API_KEY')
```


## Import a wallet

Additionally, you can import a wallet created with another software or library:

```typescript
import { InitializeWallet } from 'chaingate'  
  
// Initialize wallet from keystore  
const keystore = '{"cipher":"aes-128-ctr"...}'  
const wallet = await InitializeWallet.fromKeystore('API_KEY', keystore, 'password')  
  
//Initialize wallet from phrase  
const phrase = 'abandon abandon about ...'  
const wallet = await InitializeWallet.fromPhrase('API_KEY', phrase)  
  
//Initalize wallet from seed  
const wallet1 = await InitializeWallet.fromSeed('API_KEY', '676c4f62...')  
const wallet2 = await InitializeWallet.fromSeed('API_KEY', new Uint8Array([0x01, 0x02, 0x03]))  
  
//Initalize wallet from private key  
const wallet1 = await InitializeWallet.fromPrivateKey('API_KEY', '6b53aa40...')  
const wallet2 = await InitializeWallet.fromPrivateKey('API_KEY', new Uint8Array([0xab, 0xcd, 0xed]))
```


## Keys and exporting

You can access the seed phrase or private keys of the wallet you have just created or imported:

```typescript
import { InitializeWallet } from 'chaingate'  
  
const wallet = await InitializeWallet.create('API_KEY')  
  
// Export phrase or seed  
const phrase : string = wallet.Phrase   //Phrase  
const seed : string = wallet.getSeed()  //Seed  
  
  
const wallet2 = await InitializeWallet.fromPrivateKey('API_KEY', '6b53aa40...')  
  
// Export private key of the wallet in various formats  
const privateKeyRaw : Uint8Array = wallet2.PrivateKey.raw  
const privateKeyHexa : string = wallet2.PrivateKey.hexa  
const privateKeyWIF : string = wallet2.PrivateKey.wif  
  
// Export public key of the wallet  
const publicKey = await wallet2.PrivateKey.getPublicKey()  
const publicKeyCompressed = publicKey.compressed  
const publicKeyUncompressed = publicKey.uncompressed
```


## Addresses

Additionally, to obtain addresses of different blockchains:

```typescript
import { InitializeWallet } from 'chaingate'  
  
const wallet = await InitializeWallet.create('API_KEY')  
  
const bitcoinAddress = await wallet.currencies.bitcoin.getAddress()  
const ethereumAddress = await wallet.currencies.ethereum.getAddress()  
```


## Derivation paths

If you import using a phrase or seed, you can utilize derivation paths in any currency. By default, the derivation path used is the default for the currency.

To change the derivation path, call setDerivationPath() as follows:

```typescript
import { InitializeWallet } from 'chaingate'  
  
const wallet = await InitializeWallet.create('API_KEY')  
  
//Use non-default derivation path  
await wallet.currencies.bitcoin.setDerivationPath('m/44\'/0\'/0\'/1/3')  
  
const address = await wallet.currencies.bitcoin.getAddress()
```


# Query balances

To initiate a transaction or operate on the blockchain, you need to fund your addresses. After funding your wallet's addresses, you can query their balances to confirm you possess the corresponding crypto:

```typescript
import { InitializeWallet } from 'chaingate'  
  
const wallet = await InitializeWallet.create('')  
  
// Verify your crypto addresses (in bitcoin and ethereum) to fund them  
const bitcoinAddress = wallet.currencies.bitcoin.getAddress()  
const ethereumAddress = wallet.currencies.ethereum.getAddress()  
  
// Query the balance of Bitcoin  
const bitcoinBalance = await wallet.currencies.bitcoin.getBalance()  
console.log(`Confirmed balance in BTC: ${bitcoinBalance.confirmed.btc}`)  
console.log(`Confirmed balance in satoshi: ${bitcoinBalance.confirmed.btc}`)  
  
// Query the balance of Ethereum  
const ethereumBalance = await wallet.currencies.ethereum.getBalance()  
console.log(`Confirmed balance in ETH: ${ethereumBalance.confirmed.eth}`)  
console.log(`Confirmed balance in wei: ${ethereumBalance.confirmed.wei}`)  
  
//Get a resume of balances  
const allBalances = await wallet.getAllBalances()  
for(const b of allBalances)  
    console.log(`Your ${b.currency.name} wallet amount is ${b.balance.confirmed.baseAmount} ${b.balance.confirmed.baseSymbol}`)
```


# Create and broadcast a transaction

Transferring crypto is easy with ChainGate. You can prepare a transaction, query the possible fees, confirm it, and broadcast it to the network:

```typescript
import { Wallet } from 'chaingate'
import { Satoshi } from 'chaingate/currencies/Bitcoin'

const phrase = 'abandon abandon about...'
const wallet = Wallet.fromPhrase('API_KEY', keystore)

//Verify the address and balance of your wallet
const bitcoinAddress = wallet.Currencies.Bitcoin.getAddress()
const bitcoinBalance = await wallet.Currencies.Bitcoin.getBalance()
console.log(`The Bitcoin address of your wallet is {bitcoinAddress}`)
console.log(`You currently have {bitcoinBalance} BTC`)

//Prepare the transaction
const transaction = await wallet.Currencies.Bitcoin.prepareTransfer(
	'1111111111111111111114oLvT2', //Destination address
	Satoshis(1_000) //Amount (in Satoshi)
)

//We will use fast fees for transaction to confirm earlier
console.log(`We are going to use a fee of {transaction.possibleFees['high']}`)

//Broadcast the transaction
const broadcasted = await transaction.confirm('high') //High confirmation fees
console.log(`Transaction is on the network :) The txid is {broadcasted.txId}`)

//Wait until is confirmed
console.log('Wait for confirmation... This might take a while')
await broadcasted.isConfirmed()
console.log('The transaction is fully confirmed`)
```


# Query RPCs

If you're using libraries such as Web3.js or Ethers, or need to work with code not directly supported by ChainGate, you can leverage ChainGate's reliable RPC endpoints for various cryptocurrencies, including:

- Arbitrum
- Avalanche C-Chain
- Binance Smart Chain
- Bitcoin
- Boba Network
- Ethereum
- Fantom Opera
- Polygon
- zkSync

To access these RPCs, query the API URL, which can be found in the [ChainGate API Documentation RPCs](https://api.chaingate.dev/docs#tag/RPCs).

When using Web3.js or Ethers, include your API KEY in the URL within the 'apiKey' parameter:

```typescript
import Web3 from 'web3'  
const chainGateApiKey = 'API_KEY'  
const web3 = new Web3(`https://api.chaingate.dev/rpc/binance?api_key=${chainGateApiKey}`)  
  
const latestBlock = await web3.eth.getBlock('latest')  
console.log(latestBlock)
```

```typescript
import { JsonRpcProvider } from 'ethers'  
const chainGateApiKey = 'API_KEY'  
const ethers = new JsonRpcProvider(`https://api.chaingate.dev/rpc/binance?api_key=${chainGateApiKey}`)  
  
const latestBlock = await ethers.getBlock('latest')  
console.log(latestBlock)
```


# Query the API directly

ChainGate offers a ChainGate API with REST endpoints, providing advanced features and information on supported blockchains.

API documentation: [ChainGate API Documentation](https://api.chaingate.dev/docs)

Key features of the API include:

- Transaction details
- Mempool
- Block transactions
- (...)

Access the API through a ApiClient instance:

```typescript
import { ApiClient } from 'chaingate'  

const apiClient = new ApiClient('API_KEY')  
  
//Get transaction details  
const transactionDetails = (await apiClient.Bitcoin.transactionDetails('e9a66845...')).data  
  
//Get mempool transactions  
const mempool = (await apiClient.Ethereum.mempool()).data  
  
//Get block transactions  
const blockTransactions = (await apiClient.Bitcoin.blockTransactions(1000)).data
```


# Why am I receiving the message "You are running with an unencrypted wallet..."

Occasionally, you may receive the following message through the console:

```
You are running with an unencrypted wallet. This should only be done for development purposes.
If you intend to use it in production, call encrypt(password) after it is created,
and run functions that require the usage of private key with runUnencrypted(password, ...)
```

Software wallets face a significant problem: the private key is stored unencrypted in the memory. If someone gains access to the computer's memory (e.g., through a debugger), the wallet's private key can be compromised.

The solution that ChainGate proposes is to encrypt the wallet with a password (using AES encryption) and ask the user for the password every time the private key needs to be accessed (such as when building a transaction or exporting the private key).

To implement this, encrypt the wallet initially and, for every code that outputs the message, prompt the user for the password and run the code with `runUnencrypted(password, ...)`. Here's an example:

```typescript
import { InitializeWallet } from 'chaingate'  
import p from 'prompt-sync'  
import {Units} from 'chaingate'  
const prompt = p()  
  
//Initialize wallet  
const phrase = 'abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon about'  
const wallet = await InitializeWallet.fromPhrase('API_KEY', phrase)

//Ask for password  
const walletPassword = prompt('Wallet password? ')  

//Encrypt wallet  
await wallet.encrypt(walletPassword)
```

```typescript
//Prepare a transaction  
const transaction = await wallet.currencies.bitcoin.prepareTransfer(  
    '1111111111111111111114oLvT2', //Destination address  
    Units.Satoshis('1_000_000') //Amount (in Satoshi)  
)  
  
//Broadcast the transaction (need to acess the private key)  
const password = prompt('What is the wallet password? ')  
await wallet.runUnencrypted(password, async () => {  
    await transaction.confirm('normal')  
})
```

To remove this message safely, set the variable `process.env.I_AM_SURE_I_AM_NOT_IN_PRODUCTION` to a truthy value.


# Why I am receiving the message "You have exhausted your API tier limit..."

If you encounter the message:

```
You have exhausted your API tier limit, and ChainGate is operating beyond its capacity. Consider upgrading to a higher tier.
```

it indicates that you have reached the limit of your current API tier with ChainGate. As a result, you may experience delays or slower performance when using the API. To resolve this issue, you should consider upgrading to a higher tier or paying for a ChainGate subscription.

You can upgrade your tier or manage your subscription by visiting the ChainGate application at [https://app.chaingate.dev](https://app.chaingate.dev/).

To remove this message safely, set the variable `process.env.DISABLE_EXHAUSTED_TIER_MESSAGE` to a truthy value.


# I can't build my web app: "webpack < 5 used to include polyfills for node.js core modules by default"

**What's the issue?**

Webpack versions below 5 automatically included polyfills for certain Node.js core modules. These polyfills make those modules work in browser environments. With Webpack 5, this behavior changed, and you might need to configure polyfills manually.

**Why does ChainGate need polyfills?**

ChainGate uses some native libraries that aren't available directly in browsers. Polyfills provide browser-compatible versions of these libraries.

**Solution: Using `node-polyfill-webpack-plugin`**

To fix this, you can use a helpful plugin called `node-polyfill-webpack-plugin`.

Here's how to integrate it:

1. **Install the plugin:**

```
npm install node-polyfill-webpack-plugin
```

2. **Update `webpack.config.js`:**

Add the following code to your `webpack.config.js` file:

``` javascript
const NodePolyfillPlugin = require('node-polyfill-webpack-plugin');
    
module.exports = {
	// Other rules...
	plugins: [
		new NodePolyfillPlugin(),
	],
};
```

This code imports the plugin and adds it to the `plugins` array in your Webpack configuration.

**Special thanks** to Richienb for creating this amazing module!