import {ethers} from 'ethers'
import {Utils} from '../../../Utils'
import IncorrectPassword from './IncorrectPassword'

export async function decryptKeystore(keystoreStr: string, password: string) {
    try{
        const ethersWallet = await ethers.Wallet.fromEncryptedJson(keystoreStr, password)
        return Utils.hexToBytes(ethersWallet.privateKey)
    }catch (ex){
        if(ex instanceof TypeError && 'argument' in ex && ex.argument == 'password') throw new IncorrectPassword()
        throw ex
    }

}
