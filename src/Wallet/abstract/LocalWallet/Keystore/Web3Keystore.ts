import {ethers} from 'ethers'
import {IncorrectPassword} from './errors'
import {hexToBytes} from '../../../../Utils/Utils'
import {PrivateKey} from '../../../entities/Secret/implementations/PrivateKey'
import {Keystore} from './Keystore'

export interface Web3KeystoreData {
    crypto: {
        cipher: string
        ciphertext: string
        cipherparams: {
            iv: string
        }
        kdf: 'scrypt'
        kdfparams: {
            dklen: number
            n: number
            p: number
            r: number
            salt: string
        }
        mac: string
    }
    version: 3
}


export class Web3Keystore extends Keystore<PrivateKey>{
    private readonly keystoreData

    constructor(keystoreData: Web3KeystoreData) {
        super()
        this.keystoreData = keystoreData
    }

    async checkPassword(password: string): Promise<boolean> {
        try {
            await ethers.Wallet.fromEncryptedJson(JSON.stringify(this.keystoreData), password)
            return true
        } catch (ex) {
            if (ex instanceof TypeError && 'argument' in ex && ex.argument === 'password') {
                return false
            }
            throw new Error('Invalid keystore')
        }
    }

    async decrypt(password: string): Promise<PrivateKey> {
        try {
            const ethersWallet = await ethers.Wallet.fromEncryptedJson(JSON.stringify(this.keystoreData), password)
            return new PrivateKey(hexToBytes(ethersWallet.privateKey))
        } catch (ex) {
            if (ex instanceof TypeError && 'argument' in ex && ex.argument === 'password') {
                throw new IncorrectPassword()
            }
            throw new Error('Invalid keystore')
        }
    }

    static isKeystore(obj: object): boolean {
        return 'version' in obj && obj.version == 3
    }
}
