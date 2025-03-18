import {HDWallet} from './HDWallet/HDWallet'
import {AllCurrencies, Currencies, SerializedWallet} from '../Wallet'
import {ExtendedPublicKey} from '../entities/Secret/implementations/ExtendedPublicKey'
import {WalletEncryption, WalletIsNotEncrypted} from '../entities/WalletEncryption/WalletEncryption'
import {ChainGateClient} from 'chaingate-client'
import {Encrypted} from '../entities/WalletEncryption/Encrypted'
import {CurrencyProviders} from '../entities/Currency/CurrencyProviders'
import {Seed} from '../entities/Secret/implementations/Seed'
import {bytesToHex, mapToRecord, transformMap} from '../../Utils/Utils'
import {Secret} from '../entities/Secret/Secret'

export type SerializedSeedableWallet = SerializedWallet & {
    secret:  {
        iterations: number,
        dkLen: number,
        nonce: string,
        salt: string,
        data: string,
        cipher: string
    },
    derivationPaths: Record<string, string>
    publicKeys: Record<string, string>
}

export abstract class SeedableWallet extends HDWallet<ExtendedPublicKey, AllCurrencies>{
    protected walletEncryption: WalletEncryption
    protected walletUniqueId: string

    protected constructor(apiClient: ChainGateClient, secret: Secret | Encrypted, askForPassword?: (attempts: number, reject: () => void) => Promise<string>) {
        const currencyProviders : CurrencyProviders = {
            getPublicKeyProvider: async (currencyInfo) => {
                const derivationPath = this.getDerivationPath(currencyInfo)
                return this.deriveFromPathUsingCache.bind(this, derivationPath)
            },
            getPrivateKeyProvider: async (currencyInfo) => {
                const derivationPath = this.getDerivationPath(currencyInfo)
                const seed = await this.getSeed()
                return seed.getPrivateKey.bind(seed, derivationPath)
            }
        }
        super(apiClient, currencyProviders)
        this.walletEncryption = new WalletEncryption(secret instanceof Encrypted ? secret : secret.raw, askForPassword)
    }

    abstract getSeed(): Promise<Seed>

    protected async deriveFromPath(derivationPath: string): Promise<ExtendedPublicKey> {
        const seed = await this.getSeed()
        return seed.getExtendedPublicKey(derivationPath)
    }

    protected async internalSerialize(walletType: string): Promise<SerializedSeedableWallet> {
        const secret = this.walletEncryption.getSecret()
        if(!(secret instanceof Encrypted)) throw new WalletIsNotEncrypted()

        const publicKeysStr = transformMap(
            this.derivationResults,
            (e) => e.xpub
        )

        return {
            format: 'ChainGate Serialize Wallet Format Version 2',
            walletUniqueId: await this.getWalletUniqueId(),
            walletType: walletType,
            secret: {
                iterations: secret.iterations,
                dkLen: secret.dkLen,
                nonce: bytesToHex(secret.nonce, false),
                salt: bytesToHex(secret.salt, false),
                data: bytesToHex(secret.data, false),
                cipher: secret.cipher

            },
            publicKeys: mapToRecord(publicKeysStr),
            derivationPaths: mapToRecord(this.derivationPaths)
        }
    }

    async getWalletUniqueId(): Promise<string> {
        return this.walletUniqueId
    }

    protected supportedCurrencies: AllCurrencies[] = Currencies
}
