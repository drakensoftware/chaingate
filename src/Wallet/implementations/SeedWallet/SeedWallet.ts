import { Seed } from '../../entities/Secret/implementations/Seed'
import { SerializedWallet } from '../../Wallet'
import { SeedableWallet, SerializedSeedableWallet } from '../../abstract/SeedableWallet'
import { Encrypted } from '../../entities/WalletEncryption/Encrypted'
import { Encrypt } from '../../entities/WalletEncryption/WalletEncryption'
import { hexToBytes, recordToMap, transformMap } from '../../../InternalUtils/Utils'
import { ExtendedPublicKey } from '../../entities/Secret/implementations/ExtendedPublicKey'
import { Client } from '@hey-api/client-fetch'
import { TtlCache } from '../../../InternalUtils/TtlCache'
import { GlobalMarketsResponse } from '../../../Client'

export class SeedWallet extends SeedableWallet {
    constructor(
        client: Client,
        markets: TtlCache<GlobalMarketsResponse>,
        secret: Seed | Encrypted,
        askForPassword?: (attempts: number, reject: () => void) => Promise<string>,
    ) {
        super(client, markets, secret, askForPassword)
    }

    protected async serializeInternal(): Promise<SerializedWallet> {
        return await this.internalSerialize('seed')
    }

    async getSeed(): Promise<Seed> {
        return new Seed(await this.walletEncryption.getSecretDecrypted())
    }

    static async new(
        client: Client,
        markets: TtlCache<GlobalMarketsResponse>,
        seed: string | Uint8Array,
        warnAboutUnencrypted: boolean,
        encrypt?: Encrypt,
    ) {
        const newSeed = new Seed(seed)
        const wallet = new SeedWallet(client, markets, newSeed, encrypt?.askForPassword)
        wallet.walletUniqueId = newSeed.uniqueId

        await wallet.generateAllCurrencyDefaultDerivations()

        if (encrypt) await wallet.walletEncryption.encrypt(encrypt.password)
        wallet.walletEncryption.warnAboutUnencrypted = warnAboutUnencrypted

        return wallet
    }

    static async import(
        client: Client,
        markets: TtlCache<GlobalMarketsResponse>,
        exported: SerializedSeedableWallet,
        askForPassword: (attempts: number, reject: () => void) => Promise<string>,
    ): Promise<SeedWallet> {
        const encrypted = new Encrypted({
            iterations: exported.secret.iterations,
            dkLen: exported.secret.dkLen,
            nonce: hexToBytes(exported.secret.nonce),
            salt: hexToBytes(exported.secret.salt),
            data: hexToBytes(exported.secret.data),
            cipher: exported.secret.cipher,
        })

        if (!(exported.walletType == 'seed')) throw new Error('Wallet format error')

        const wallet = new SeedWallet(client, markets, encrypted, askForPassword)
        wallet.walletUniqueId = exported.walletUniqueId
        wallet.derivationPaths = recordToMap(exported.derivationPaths)

        const derivationResultsStr = recordToMap(exported.publicKeys)
        wallet.derivationResults = transformMap(
            derivationResultsStr,
            (t) => new ExtendedPublicKey(t),
        )

        return wallet
    }
}
