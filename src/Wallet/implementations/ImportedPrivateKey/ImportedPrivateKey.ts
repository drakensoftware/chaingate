import {ChainGateClient} from 'chaingate-client'

import {bytesToHex, hexToBytes} from '../../../Utils/Utils'
import {Encrypt, LocalWallet} from '../../abstract/LocalWallet/LocalWallet'
import {PublicKey} from '../../entities/PublicKey'
import {PrivateKey} from '../../entities/Secret/implementations/PrivateKey'
import {AllCurrencies, Currencies, CurrencyMap, ExportedWalletData} from '../../Wallet'
import {PrivateKeySign} from '../../entities/Currency/CurrencyParams'
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


export class ImportedPrivateKey extends LocalWallet<PrivateKey, AllCurrencies> {
    declare currencyParams: PrivateKeySign
    private _publicKey: PublicKey

    async getPublicKey(){
        if(!this._publicKey) this._publicKey = (await this.getPrivateKey()).publicKey
        return Promise.resolve(this._publicKey)
    }

    async getPrivateKey(){
        return await this.getSecret()
    }

    protected constructor(apiClient: ChainGateClient, secret: PrivateKey, exportedWalletData?: ExportedWalletData) {
        const currencyParams : PrivateKeySign = {
            signMode: 'privateKey',
            getPrivateKey: () => { return this.getPrivateKey() },
            getPublicKey: () => { return this.getPublicKey() }
        }
        super(apiClient, currencyParams, secret)
        if(exportedWalletData) this._publicKey = new PublicKey(hexToBytes(exportedWalletData.publicKey))
    }

    static async new(apiClient: ChainGateClient, privateKey: PrivateKey, warnAboutUnencrypted: boolean, encrypt?: Encrypt, exportedWalletData?: ExportedWalletData) {
        const wallet = new ImportedPrivateKey(apiClient, privateKey, exportedWalletData)

        if(encrypt) await wallet.encrypt(encrypt.password, encrypt.askForPassword)
        wallet.warnAboutUnencrypted = warnAboutUnencrypted

        return wallet
    }

    async exportWalletData(): Promise<ExportedWalletData> {
        return {
            walletUniqueId: await this.getWalletUniqueId(),
            publicKey: bytesToHex((await this.getPublicKey()).raw, true)
        }
    }

    currency<T extends AllCurrencies>(currency: AllCurrencies): CurrencyMap[T] {
        const currencyMap: CurrencyMap = {
            'arbitrum': new Arbitrum(this.apiClient.ArbitrumApi, this.currencyParams),
            'avalanche': new Avalanche(this.apiClient.AvalancheApi, this.currencyParams),
            'base': new Base(this.apiClient.BaseApi, this.currencyParams),
            'bnbChain': new BNBChain(this.apiClient.BNBChainApi, this.currencyParams),
            'ethereum': new Ethereum(this.apiClient.EthereumApi, this.currencyParams),
            'fantomOpera': new FantomOpera(this.apiClient.FantomOperaApi, this.currencyParams),
            'polygon': new Polygon(this.apiClient.PolygonApi, this.currencyParams),
            'bitcoin': new Bitcoin(this.apiClient.BitcoinApi, this.currencyParams),
            'bitcoinTestnet': new BitcoinTestnet(this.apiClient.BitcoinTestnetApi, this.currencyParams),
            'dogecoin': new Dogecoin(this.apiClient.DogecoinApi, this.currencyParams),
            'litecoin': new Litecoin(this.apiClient.LitecoinApi, this.currencyParams),
            'bitcoinCash': new BitcoinCash(this.apiClient.BitcoinCashApi, this.currencyParams)
        }

        return currencyMap[currency] as CurrencyMap[T]
    }

    protected supportedCurrencies: AllCurrencies[] = Currencies
}
