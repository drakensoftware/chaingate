import {HDWallet} from '../../abstract/HDWallet/HDWallet'
import {ChainGateClient} from 'chaingate-client'
import {Seed} from '../../entities/Secret/implementations/Seed'
import {Encrypt} from '../../abstract/LocalWallet/LocalWallet'
import {ExportedWalletData} from '../../Wallet'

export class SeedWallet extends HDWallet<Seed>{
    protected constructor(apiClient: ChainGateClient, secret: Seed, exportedWalletData?: ExportedWalletData) {
        super(apiClient, secret, exportedWalletData)
    }

    static async new(apiClient: ChainGateClient, seed: Seed, warnAboutUnencrypted: boolean, encrypt?: Encrypt, exportedWalletData?: ExportedWalletData) {
        const wallet = new SeedWallet(apiClient, seed, exportedWalletData)

        await wallet.derivePublicKeys()

        if(encrypt) await wallet.encrypt(encrypt.password, encrypt.askForPassword)
        wallet.warnAboutUnencrypted = warnAboutUnencrypted

        return wallet
    }

    async getSeed(): Promise<Seed> {
        return await this.getSecret() as Seed
    }
}
