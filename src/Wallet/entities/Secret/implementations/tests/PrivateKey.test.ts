import { PrivateKey, PrivateKeyEncodingError } from '../PrivateKey'

describe('Private key', () => {
    it('New private key', async () => {
        process.env.I_AM_SURE_I_AM_NOT_IN_PRODUCTION = String(true)
        const privateKey = new PrivateKey(
            '741745080050f2ce656aaa2a983a6b510caa706643e1ad05214feac6677ba657',
        )
        expect(privateKey.hex).toBe(
            '741745080050f2ce656aaa2a983a6b510caa706643e1ad05214feac6677ba657',
        )
    })

    it('Invalid private key', async () => {
        await expect(async () => new PrivateKey('Invalid hexadecimal')).rejects.toThrow(
            PrivateKeyEncodingError,
        )
    })
})
