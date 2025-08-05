import { getTestApiKey, getTestPhrase } from '../../../../../TestUtils/TestUtils'
import * as initializeWallet from '../../../../../InitializeWallet'

describe('Bitcoin', function () {
    it('Generate addresses', async () => {
        const wallet = await initializeWallet.fromPhrase({ phrase: getTestPhrase() })
        const bitcoin = wallet.currency('bitcoin')

        expect(bitcoin.utils.currencyInfo.defaultDerivationPath).toBe("m/84'/0'/0'/0/0")

        expect(await bitcoin.getAddress()).toBe('bc1qcu2aq327lzgee5f9vqm7m23fhck39ja7j37ass')

        bitcoin.setDerivationPath("m/86'/0'/0'/0/0")
        expect(await bitcoin.getAddress('taproot-p2tr')).toBe(
            'bc1ps6lm9t9yx6etly4y06hvqwyyzk4pc0j02w58s2frsgxlsh5hv47qvermj7',
        )

        // Legacy
        bitcoin.setDerivationPath("m/44'/0'/0'/0/0")
        expect(await bitcoin.getAddress('legacy-p2pkh')).toBe('1BeH9f5U1N6nyvMwzzqyzEEGd2FaNReK9J')

        // Segwit
        bitcoin.setDerivationPath("m/84'/0'/0'/0/0")
        expect(await bitcoin.getAddress('segwit-p2wpkh')).toBe(
            'bc1qcu2aq327lzgee5f9vqm7m23fhck39ja7j37ass',
        )
    })

    it('Get address balance', async () => {
        const wallet = await initializeWallet.fromPhrase({
            phrase: getTestPhrase(),
            apiKey: getTestApiKey(),
        })
        const bitcoin = wallet.currency('bitcoin')

        const balance = await bitcoin.getBalance()
        expect(balance.confirmed.baseAmount.toString()).toMatchSnapshot()
        expect(balance.unconfirmed.baseAmount.toString()).toMatchSnapshot()
    })

    it('Transfer', async () => {
        const wallet = await initializeWallet.fromPhrase({
            phrase: getTestPhrase(),
            warnAboutUnencrypted: false,
            apiKey: getTestApiKey(),
        })

        const bitcoin = wallet.currency('bitcoin')

        const transferNotEnoughFunds = await bitcoin.createTransfer(
            'bc1qv5r9mr7ajz2jh04d87c4nnhfjj0jqhm3z5v0hx',
            bitcoin.utils.amount('1', 'btc'),
        )

        let suggestedFees = await transferNotEnoughFunds.getSuggestedFees()
        expect(suggestedFees.normal.enoughFunds).toBeFalsy()

        const transfer = await bitcoin.createTransfer(
            'bc1qv5r9mr7ajz2jh04d87c4nnhfjj0jqhm3z5v0hx',
            bitcoin.utils.amount('0.000005', 'btc'),
        )

        suggestedFees = await transfer.getSuggestedFees()
        expect(suggestedFees.normal.enoughFunds).toBeTruthy()

        const broadcastedTransfer = await transfer.broadcast('normal')
        expect(broadcastedTransfer.transactionId).toMatchSnapshot()
    })

    it('Sign message', async () => {
        const wallet = await initializeWallet.fromPhrase({
            phrase: getTestPhrase(),
            warnAboutUnencrypted: false,
            apiKey: getTestApiKey(),
        })
        const bitcoin = wallet.currency('bitcoin')

        const signature = await bitcoin.signMessage('Test')
        expect(signature).toMatchSnapshot()

        const address = await bitcoin.getAddress()
        expect(await bitcoin.utils.verifySignedMessage('Test', signature, address)).toBeTruthy()

        expect(await bitcoin.utils.verifySignedMessage('Invalid', signature, address)).toBeFalsy()
    })
})
