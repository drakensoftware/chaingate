import {setupCryptoGetRandomValuesMock} from '../../../../../Utils/TestUtils'
import {IncorrectPassword} from '../errors'
import {Web3Keystore} from '../Web3Keystore'
import {PrivateKey} from '../../../../entities/Secret/implementations/PrivateKey'

setupCryptoGetRandomValuesMock()


describe('Web3 Keystore', () => {

    it('Web3 keystore from string', async () => {
        const keystoreStr = '{"address":"014c1c3a420c781061a8decc2f3e00cda1c59816","crypto":{"cipher":"aes-128-ctr","ciphertext":"6b35eafed8217cb2bda7d57f7e165e26caedb653defbf83deed4acbb3b47609e","cipherparams":{"iv":"be2065014801e9264e114c32728c7c09"},"kdf":"scrypt","kdfparams":{"dklen":32,"n":262144,"p":1,"r":8,"salt":"a109b4a90baa55fe59c47a9915de0dd91a357e1ba02b26234a5fe2b8cbcceca2"},"mac":"8905d186d71c6fd6e2df02f4bc3233a46f38aedba5dc55b6c4efe0fbf87979e6"},"id":"39a6290e-f719-4339-9b0f-97fb7ed3e4b4","version":3}'
        const keystore = new Web3Keystore(JSON.parse(keystoreStr))

        await expect(async () => keystore.decrypt('Incorrect password')).rejects.toThrow(IncorrectPassword)

        const x = await keystore.decrypt('1234')

        expect(x instanceof PrivateKey).toBeTruthy()
        if(!(x instanceof PrivateKey)) throw new Error() // Casting types

        expect(x.hexa).toBe('0b9882e54799f1b73bde750298d841dc7a83ea99c85de0f38559d747b48f65af')
    })

})
