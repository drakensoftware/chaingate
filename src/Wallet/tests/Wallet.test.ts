import {setupCryptoGetRandomValuesMock} from '../../Utils/TestUtils'
import {initializeWallet} from '../../index'

setupCryptoGetRandomValuesMock()


describe('Wallet', () => {

    it('Export wallet', async () => {
        process.env.I_AM_SURE_I_AM_NOT_IN_PRODUCTION = String(true)

        const wallet = await initializeWallet.fromPhrase({phrase: 'abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon about',
            // eslint-disable-next-line @typescript-eslint/no-unused-vars
            encrypt: {password: '1234', askForPassword: async (_attempts, _reject) => {return '1234'}}})
        expect(await wallet.exportKeys()).toMatchSnapshot()
        expect(await wallet.exportWalletData()).toMatchSnapshot()
    })

})
