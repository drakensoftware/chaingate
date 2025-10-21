import { bytesToHex, hexToBytes } from '../../../InternalUtils/Utils'
import { PublicKey } from '../../entities/PublicKey'
import { PrivateKey } from '../../entities/Secret/implementations/PrivateKey'
import { Encrypted } from '../../entities/WalletEncryption/Encrypted'
import { Transports } from '../../../Currencies/CurrencyWallet/Transports'
import {
    Encrypt,
    WalletEncryption,
    WalletIsNotEncrypted,
} from '../../entities/WalletEncryption/WalletEncryption'
import { SerializedWallet, Wallet } from '../../Wallet'
import { AllCurrencies } from '../../../Currencies/CurrencyModules'
import { ChainGateContext } from '../../../Currencies/CurrencyUtils/ChainGateContext'

export type SerializedPrivateKeyWallet = SerializedWallet & {
    secret: {
        iterations: number
        dkLen: number
        nonce: string
        salt: string
        data: string
        cipher: string
    }
    publicKey: string
}

export class PrivateKeyWallet extends Wallet<(typeof AllCurrencies)[number]> {
    protected supportedCurrencies = AllCurrencies

    private publicKey: PublicKey
    private walletUniqueId: string
    private walletEncryption: WalletEncryption

    async getPublicKey() {
        if (!this.publicKey) this.publicKey = (await this.getPrivateKey()).publicKey
        return Promise.resolve(this.publicKey)
    }

    async getPrivateKey() {
        return new PrivateKey(await this.walletEncryption.getSecretDecrypted())
    }

    protected constructor(
        context: ChainGateContext,
        secret: PrivateKey | Encrypted,
        askForPassword?: (attempts: number, reject: () => void) => Promise<string>,
    ) {
        const transports: Transports = {
            // eslint-disable-next-line @typescript-eslint/no-unused-vars
            getPrivateKeyProvider: async (_currencyInfo) => {
                return this.getPrivateKey.bind(this)
            },
            // eslint-disable-next-line @typescript-eslint/no-unused-vars
            getPublicKeyProvider: async (_currencyInfo) => {
                return this.getPublicKey.bind(this)
            },
        }
        super(context, transports)
        this.walletEncryption = new WalletEncryption(
            secret instanceof PrivateKey ? secret.raw : secret,
            askForPassword,
        )
    }

    static async new(
        context: ChainGateContext,
        privateKey: Uint8Array | string,
        warnAboutUnencrypted: boolean,
        encrypt?: Encrypt,
    ) {
        const newPrivateKey = new PrivateKey(privateKey)
        const wallet = new PrivateKeyWallet(context, newPrivateKey, encrypt?.askForPassword)
        wallet.walletUniqueId = newPrivateKey.uniqueId

        wallet.publicKey = newPrivateKey.publicKey

        if (encrypt) await wallet.walletEncryption.encrypt(encrypt.password)
        wallet.walletEncryption.warnAboutUnencrypted = warnAboutUnencrypted

        return wallet
    }

    static async import(
        context: ChainGateContext,
        exported: SerializedPrivateKeyWallet,
        askForPassword: (attempts: number, reject: () => void) => Promise<string>,
    ): Promise<PrivateKeyWallet> {
        const encrypted = new Encrypted({
            iterations: exported.secret.iterations,
            dkLen: exported.secret.dkLen,
            nonce: hexToBytes(exported.secret.nonce),
            salt: hexToBytes(exported.secret.salt),
            data: hexToBytes(exported.secret.data),
            cipher: exported.secret.cipher,
        })

        if (!(exported.walletType == 'privateKey')) throw new Error('Wallet format error')

        const wallet = new PrivateKeyWallet(context, encrypted, askForPassword)
        wallet.walletUniqueId = exported.walletUniqueId
        wallet.publicKey = new PublicKey(hexToBytes(exported.publicKey))
        return wallet
    }

    async getWalletUniqueId(): Promise<string> {
        return this.walletUniqueId
    }

    protected async serializeInternal(): Promise<SerializedPrivateKeyWallet> {
        const secret = this.walletEncryption.getSecret()
        if (!(secret instanceof Encrypted)) throw new WalletIsNotEncrypted()
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
                cipher: secret.cipher,
            },
            publicKey: this.publicKey.hex,
        }
    }
}
