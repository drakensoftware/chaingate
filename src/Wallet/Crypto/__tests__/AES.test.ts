import IncorrectPassword, {decryptAES, encryptAES} from '../AES'

beforeEach(() => {
    jest.spyOn(global.crypto, 'getRandomValues').mockImplementation((buffer) => {
        const n = buffer as Uint8Array
        n.fill(0x00)
        return n
    })
})

afterEach(() => {
    jest.spyOn(global.crypto, 'getRandomValues').mockRestore()
})


describe('AES', () => {

    it('Should correctly encrypt and decrypt', async () => {
        const phrase = 'Phrase'
        const password = 'Password'

        const data = new TextEncoder().encode(phrase)
        const encrypted = await encryptAES(data, password)
        const decrypted = await decryptAES(encrypted, password)
        expect(new TextDecoder().decode(decrypted)).toBe(phrase)
    })

    it('Should throw on incorrect password invalid', async () => {
        const phrase = 'Phrase'
        const password = 'Password'
        const incorrectPassword = 'Incorrect Password'

        const data = new TextEncoder().encode(phrase)
        const encrypted = await encryptAES(data, password)
        await expect(() => decryptAES(encrypted, incorrectPassword)).rejects.toThrow(IncorrectPassword)
    })

})
