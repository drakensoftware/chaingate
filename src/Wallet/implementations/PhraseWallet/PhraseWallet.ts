import {HDWallet} from '../../abstract/HDWallet/HDWallet'
import {ChainGateClient} from 'chaingate-client'
import {Phrase} from '../../entities/Secret/implementations/Phrase'
import {Seed} from '../../entities/Secret/implementations/Seed'
import {ExportedWalletData} from '../../Wallet'
import {Encrypt} from '../../abstract/LocalWallet/LocalWallet'


export class PhraseWallet extends HDWallet<Phrase>{
    protected constructor(apiClient: ChainGateClient, secret: Phrase, exportedWalletData?: ExportedWalletData) {
        super(apiClient, secret, exportedWalletData)
    }

    static async new(apiClient: ChainGateClient, phrase: Phrase, warnAboutUnencrypted: boolean, encrypt?: Encrypt, exportedWalletData?: ExportedWalletData) {
        const wallet = new PhraseWallet(apiClient, phrase, exportedWalletData)

        await wallet.derivePublicKeys()

        if(encrypt) await wallet.encrypt(encrypt.password, encrypt.askForPassword)
        wallet.warnAboutUnencrypted = warnAboutUnencrypted

        return wallet
    }

    async getPhrase(){
        return await (await this.getSecret() as Phrase).getPhrase()
    }

    async getSeed(): Promise<Seed> {
        return await (await this.getSecret() as Phrase).getSeed()
    }
}
