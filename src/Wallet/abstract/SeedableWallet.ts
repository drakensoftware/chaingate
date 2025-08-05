import { HDWallet } from './HDWallet/HDWallet'
import { SerializedWallet } from '../Wallet'
import { ExtendedPublicKey } from '../entities/Secret/implementations/ExtendedPublicKey'
import {
    WalletEncryption,
    WalletIsNotEncrypted,
} from '../entities/WalletEncryption/WalletEncryption'
import { Encrypted } from '../entities/WalletEncryption/Encrypted'
import { Transports } from '../../Currencies/CurrencyWallet/Transports'
import { Seed } from '../entities/Secret/implementations/Seed'
import { bytesToHex, mapToRecord, transformMap } from '../../InternalUtils/Utils'
import { Secret } from '../entities/Secret/Secret'
import { AllCurrencies } from '../../Currencies/CurrencyModules'
import { Client } from '@hey-api/client-fetch'
import { TtlCache } from '../../InternalUtils/TtlCache'
import { GlobalMarketsResponse } from '../../Client'

export type SerializedSeedableWallet = SerializedWallet & {
    secret: {
        iterations: number
        dkLen: number
        nonce: string
        salt: string
        data: string
        cipher: string
    }
    derivationPaths: Record<string, string>
    publicKeys: Record<string, string>
}

export abstract class SeedableWallet extends HDWallet<
    ExtendedPublicKey,
    (typeof AllCurrencies)[number]
> {
    protected supportedCurrencies = AllCurrencies

    protected walletEncryption: WalletEncryption
    protected walletUniqueId: string

    protected constructor(
        client: Client,
        markets: TtlCache<GlobalMarketsResponse>,
        secret: Secret | Encrypted,
        askForPassword?: (attempts: number, reject: () => void) => Promise<string>,
    ) {
        const transports: Transports = {
            getPublicKeyProvider: async (currencyId) => {
                const derivationPath = this.getDerivationPath(
                    currencyId as (typeof AllCurrencies)[number],
                )
                return this.deriveFromPathUsingCache.bind(this, derivationPath)
            },
            getPrivateKeyProvider: async (currencyId) => {
                const derivationPath = this.getDerivationPath(
                    currencyId as (typeof AllCurrencies)[number],
                )
                const seed = await this.getSeed()
                return seed.getPrivateKey.bind(seed, derivationPath)
            },
        }
        super(client, transports, markets)
        this.walletEncryption = new WalletEncryption(
            secret instanceof Encrypted ? secret : secret.raw,
            askForPassword,
        )
    }

    abstract getSeed(): Promise<Seed>

    protected async deriveFromPath(derivationPath: string): Promise<ExtendedPublicKey> {
        const seed = await this.getSeed()
        return seed.getExtendedPublicKey(derivationPath)
    }

    protected async internalSerialize(walletType: string): Promise<SerializedSeedableWallet> {
        const secret = this.walletEncryption.getSecret()
        if (!(secret instanceof Encrypted)) throw new WalletIsNotEncrypted()

        const publicKeysStr = transformMap(this.derivationResults, (e) => e.xpub)

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
                cipher: secret.cipher,
            },
            publicKeys: mapToRecord(publicKeysStr),
            derivationPaths: mapToRecord(this.derivationPaths),
        }
    }

    async getWalletUniqueId(): Promise<string> {
        return this.walletUniqueId
    }
}
