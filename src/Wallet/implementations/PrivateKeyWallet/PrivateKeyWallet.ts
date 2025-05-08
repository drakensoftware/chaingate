import {ChainGateClient} from 'chaingate-client'

import {bytesToHex, hexToBytes} from '../../../Utils/Utils'
import {PublicKey} from '../../entities/PublicKey'
import {PrivateKey} from '../../entities/Secret/implementations/PrivateKey'
import {AllCurrencies, Currencies, CurrencyMap, SerializedWallet, Wallet} from '../../Wallet'
import {Arbitrum} from '../../entities/Currency/implementations/Arbitrum'
import {Avalanche} from '../../entities/Currency/implementations/Avalanche'
import {Base} from '../../entities/Currency/implementations/Base'
import {BNBChain} from '../../entities/Currency/implementations/BNBChain'
import {Ethereum} from '../../entities/Currency/implementations/Ethereum/Ethereum'
import {FantomOpera} from '../../entities/Currency/implementations/FantomOpera'
import {Polygon} from '../../entities/Currency/implementations/Polygon'
import {Bitcoin} from '../../entities/Currency/implementations/Bitcoin/Bitcoin'
import {BitcoinTestnet} from '../../entities/Currency/implementations/BitcoinTestnet/BitcoinTestnet'
import {Dogecoin} from '../../entities/Currency/implementations/Dogecoin/Dogecoin'
import {Litecoin} from '../../entities/Currency/implementations/Litecoin/Litecoin'
import {BitcoinCash} from '../../entities/Currency/implementations/BitcoinCash/BitcoinCash'
import {Encrypted} from '../../entities/WalletEncryption/Encrypted'
import {CurrencyProviders} from '../../entities/Currency/CurrencyProviders'
import {Encrypt, WalletEncryption, WalletIsNotEncrypted} from '../../entities/WalletEncryption/WalletEncryption'

export type SerializedPrivateKeyWallet = SerializedWallet & {
    secret:  {
        iterations: number,
        dkLen: number,
        nonce: string,
        salt: string,
        data: string,
        cipher: string
    },
    publicKey: string
}

export class PrivateKeyWallet extends Wallet<AllCurrencies>{
    private publicKey: PublicKey
    private walletUniqueId: string
    private walletEncryption: WalletEncryption

    async getPublicKey(){
        if(!this.publicKey) this.publicKey = (await this.getPrivateKey()).publicKey
        return Promise.resolve(this.publicKey)
    }

    async getPrivateKey(){
        return new PrivateKey(await this.walletEncryption.getSecretDecrypted())
    }

    protected constructor(apiClient: ChainGateClient, secret: PrivateKey | Encrypted, askForPassword?: (attempts: number, reject: () => void) => Promise<string>) {
        const keyProvider : CurrencyProviders = {
            // eslint-disable-next-line @typescript-eslint/no-unused-vars
            getPrivateKeyProvider: async (_currencyInfo) => { return this.getPrivateKey.bind(this) },
            // eslint-disable-next-line @typescript-eslint/no-unused-vars
            getPublicKeyProvider: async (_currencyInfo) => { return this.getPublicKey.bind(this) }
        }
        super(apiClient, keyProvider)
        this.walletEncryption = new WalletEncryption(secret instanceof PrivateKey ? secret.raw : secret, askForPassword)
    }

    static async new(apiKey: string, privateKey: Uint8Array | string, warnAboutUnencrypted: boolean, encrypt?: Encrypt) {
        const chainGateClient = new ChainGateClient(apiKey)
        const newPrivateKey = new PrivateKey(privateKey)
        const wallet = new PrivateKeyWallet(chainGateClient, newPrivateKey, encrypt?.askForPassword)
        wallet.walletUniqueId = newPrivateKey.uniqueId

        wallet.publicKey = newPrivateKey.publicKey

        if(encrypt) await wallet.walletEncryption.encrypt(encrypt.password)
        wallet.walletEncryption.warnAboutUnencrypted = warnAboutUnencrypted

        return wallet
    }

    static async import(apiKey: string, exported: SerializedPrivateKeyWallet, askForPassword: (attempts: number, reject: () => void) => Promise<string>) : Promise<PrivateKeyWallet>{
        const encrypted = new Encrypted({
            iterations: exported.secret.iterations,
            dkLen: exported.secret.dkLen,
            nonce: hexToBytes(exported.secret.nonce),
            salt: hexToBytes(exported.secret.salt),
            data: hexToBytes(exported.secret.data),
            cipher: exported.secret.cipher
        })

        if(!(exported.walletType == 'privateKey')) throw new Error('Wallet format error')

        const wallet = new PrivateKeyWallet(new ChainGateClient(apiKey), encrypted, askForPassword)
        wallet.walletUniqueId = exported.walletUniqueId
        wallet.publicKey = new PublicKey(hexToBytes(exported.publicKey))
        return wallet
    }

    currency<T extends AllCurrencies>(currency: AllCurrencies): CurrencyMap[T] {
        const currencyMap: CurrencyMap = {
            'arbitrum': new Arbitrum(this.client, this.client.ArbitrumApi, this.currencyProviders),
            'avalanche': new Avalanche(this.client, this.client.AvalancheApi, this.currencyProviders),
            'base': new Base(this.client, this.client.BaseApi, this.currencyProviders),
            'bnbChain': new BNBChain(this.client, this.client.BNBChainApi, this.currencyProviders),
            'ethereum': new Ethereum(this.client, this.client.EthereumApi, this.currencyProviders),
            'fantomOpera': new FantomOpera(this.client, this.client.FantomOperaApi, this.currencyProviders),
            'polygon': new Polygon(this.client, this.client.PolygonApi, this.currencyProviders),
            'bitcoin': new Bitcoin(this.client, this.client.BitcoinApi, this.currencyProviders),
            'bitcoinTestnet': new BitcoinTestnet(this.client, this.client.BitcoinTestnetApi, this.currencyProviders),
            'dogecoin': new Dogecoin(this.client, this.client.DogecoinApi, this.currencyProviders),
            'litecoin': new Litecoin(this.client, this.client.LitecoinApi, this.currencyProviders),
            'bitcoinCash': new BitcoinCash(this.client, this.client.BitcoinCashApi, this.currencyProviders)
        }

        return currencyMap[currency] as CurrencyMap[T]
    }

    protected supportedCurrencies: AllCurrencies[] = Currencies

    async getWalletUniqueId(): Promise<string> {
        return this.walletUniqueId
    }

    protected async serializeInternal(): Promise<SerializedPrivateKeyWallet> {
        const secret = this.walletEncryption.getSecret()
        if(!(secret instanceof Encrypted)) throw new WalletIsNotEncrypted()
        return {
            format: 'ChainGate Serialize Wallet Format Version 2',
            walletUniqueId: await this.getWalletUniqueId(),
            walletType: 'privateKey',
            secret: {
                iterations: secret.iterations,
                dkLen: secret.dkLen,
                nonce: bytesToHex(secret.nonce, false),
                salt: bytesToHex(secret.salt, false),
                data: bytesToHex(secret.data, false),
                cipher: secret.cipher

            },
            publicKey: this.publicKey.hex
        }
    }
}
