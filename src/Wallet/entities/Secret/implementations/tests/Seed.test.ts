import {setupCryptoGetRandomValuesMock} from '../../../../../Utils/TestUtils'
import {Seed, SeedEncodingError} from '../Seed'

setupCryptoGetRandomValuesMock()


describe('Seed', () => {

    it('New seed', async () => {
        process.env.I_AM_SURE_I_AM_NOT_IN_PRODUCTION = String(true)
        const seed = new Seed('000102030405060708090a0b0c0d0e0f')
        const privateKey = await seed.getMasterPrivateKey()
        expect(privateKey.xpriv).toBe('xprv9s21ZrQH143K3QTDL4LXw2F7HEK3wJUD2nW2nRk4stbPy6cq3jPPqjiChkVvvNKmPGJxWUtg6LnF5kejMRNNU3TGtRBeJgk33yuGBxrMPHi')
    })

    it('Invalid seed', async () => {
        await expect(async () => new Seed('Invalid hexadecimal')).rejects.toThrow(SeedEncodingError)
    })
})
