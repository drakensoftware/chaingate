import {setupCryptoGetRandomValuesMock} from '../../../../../Utils/TestUtils'
import {LegacyKeystore} from '../LegacyKeystore'
import {IncorrectPassword} from '../errors'
import {Phrase} from '../../../../entities/Secret/implementations/Phrase'

setupCryptoGetRandomValuesMock()


describe('Legacy Keystore', () => {

    it('Legacy keystore from string', async () => {
        const keystoreStr = '{"version":1,"crypto":{"cipher":"aes-128-ctr","cipherparams":{"iv":"00bee8a13b05a67c1c5dcdeaf461ee4a"},"ciphertext":"e96757767288314beb670abc4eddc40f1a36fc6f5812594d15c022aad88aff4d3a998501884b752bca0967f4c2dc6d9dabf922fd056cefa8cbc5b04a7beb64ae4f93b4af4c7543c8e83699","kdf":"pbkdf2","kdfparams":{"c":262144,"prf":"hmac-sha256","dklen":32,"salt":"da46c078f9657ecec39e9bddee7def09f37e06025c1eceb2b9412454800814db"},"mac":"3e56e57d5fcc6873f9c09e29e1a76f6f1f1c8a534f51f164ef2064607fb136c6"}}'
        const keystore = new LegacyKeystore(JSON.parse(keystoreStr))

        await expect(async () => keystore.decrypt('Incorrect password')).rejects.toThrow(IncorrectPassword)

        const x = await keystore.decrypt('1234')

        expect(x instanceof Phrase).toBeTruthy()
        if(!(x instanceof Phrase)) throw new Error() // Casting types

        expect(await x.getPhrase()).toBe('wrap comfort tip tattoo morning trade glare tribe angry meadow crisp burger')
    })

})
