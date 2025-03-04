import {setupCryptoGetRandomValuesMock} from '../../../../../Utils/TestUtils'
import {ChainGateKeystore} from '../ChainGateKeystore'
import {Phrase} from '../../../../entities/Secret/implementations/Phrase'
import {IncorrectPassword} from '../errors'

setupCryptoGetRandomValuesMock()

const keystore = {
    walletUniqueId: 'b8eee38e26035e61411c8cd3c1cf2f7255a0ca323fb3d7d6cca685ab880537a1',
    format: 'ChainGate Keystore Version 1',
    version: 1,
    type: 'phrase',
    crypto: {
        iv: '000000000000000000000000',
        kdfsalt: '0000000000000000000000000000000000000000000000000000000000000000',
        ciphertext: 'd6c5c9d5134eeadab3aadfb31ff0b85151a18c11293d9caec9537dc58a5f71419b590eeef1f6df4a7ade7c60401924d14787b40de753cf0be3e9966f935935542451f173727a8c7fd0e8b92b2989a2031f23f055fe87690b8e8340cfc8d87594231b2fe3943e763061ccb89e45'
    }
}

const phraseStr = 'abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon about'

describe('ChainGate Keystore', () => {
    test('returns true for a valid keystore string', () => {
        expect(ChainGateKeystore.isKeystore(keystore)).toBe(true)
    })

    test('returns false for an invalid keystore string', () => {
        const invalidKeystoreStr = {abab: 'CDCD'}
        expect(ChainGateKeystore.isKeystore(invalidKeystoreStr)).toBe(false)
    })

    test('successfully encrypt', async () => {
        const result = await ChainGateKeystore.from(new Phrase(phraseStr), '1234')
        expect(JSON.stringify(result.keystoreData)).toBe(JSON.stringify(keystore))
    })

    test('successfully decrypts with the correct password', async () => {
        const result = await ChainGateKeystore.from(new Phrase(phraseStr), '1234')

        expect((await result.decrypt('1234')) instanceof Phrase).toBeTruthy()
    })

    test('throws IncorrectPassword error with incorrect password', async () => {
        const result = await ChainGateKeystore.from(new Phrase(phraseStr), '1234')

        await expect(() => result.decrypt('anyPassword')).rejects.toThrow(IncorrectPassword)
    })
})
