import { Encrypted, IncorrectPassword } from '../Encrypted'
import { setupCryptoGetRandomValuesMock } from '../../../../TestUtils/TestUtils'

setupCryptoGetRandomValuesMock()

describe('Legacy Keystore', () => {
    it('Encrypt data', async () => {
        const dataToEncrypt = new Uint8Array([0x00, 0x01, 0x02])
        const encrypted = await Encrypted.encrypt(dataToEncrypt, '1234')

        await expect(async () => {
            await Encrypted.decrypt(encrypted, 'Incorrect password')
        }).rejects.toThrow(IncorrectPassword)

        const decrypted = await Encrypted.decrypt(encrypted, '1234')
        expect(JSON.stringify(decrypted)).toBe(JSON.stringify(dataToEncrypt))
    })
})
