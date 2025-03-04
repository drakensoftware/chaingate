import {PrivateKey, PrivateKeyEncodingError} from '../PrivateKey'

describe('Private key', () => {

    it('New private key', async () => {
        process.env.I_AM_SURE_I_AM_NOT_IN_PRODUCTION = String(true)
        const privateKey = PrivateKey.fromString('741745080050f2ce656aaa2a983a6b510caa706643e1ad05214feac6677ba657')
        expect(privateKey.hexa).toBe('741745080050f2ce656aaa2a983a6b510caa706643e1ad05214feac6677ba657')
    })

    it('Invalid private key', async () => {
        await expect(async () => PrivateKey.fromString('Invalid hexadecimal')).rejects.toThrow(PrivateKeyEncodingError)
    })

})
