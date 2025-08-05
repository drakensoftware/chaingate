import { getTestApiKey, getTestPhrase } from '../../../../../TestUtils/TestUtils'
import * as initializeWallet from '../../../../../InitializeWallet'

describe('Dogecoin', function () {
    it('Generate addresses', async () => {
        const wallet = await initializeWallet.fromPhrase({
            phrase: getTestPhrase(),
            warnAboutUnencrypted: false,
        })
        const dogecoin = wallet.currency('dogecoin')

        expect(dogecoin.utils.currencyInfo.defaultDerivationPath).toBe("m/44'/3'/0'/0/0")

        expect(await dogecoin.getAddress()).toBe('DKjYavqdvAFLkvxVzFuks7De1Qho3Ashfy')
    })

    it('Get address balance', async () => {
        const wallet = await initializeWallet.fromPhrase({
            phrase: getTestPhrase(),
            warnAboutUnencrypted: false,
            apiKey: getTestApiKey(),
        })
        const dogecoin = wallet.currency('dogecoin')

        const balance = await dogecoin.getBalance()
        expect(balance.confirmed.baseAmount.toString()).toMatchSnapshot()
        expect(balance.unconfirmed.baseAmount.toString()).toMatchSnapshot()
    })

    it('Transfer', async () => {
        const wallet = await initializeWallet.fromPhrase({
            phrase: getTestPhrase(),
            warnAboutUnencrypted: false,
            apiKey: getTestApiKey(),
        })

        const dogecoin = wallet.currency('dogecoin')

        const transferNotEnoughFunds = await dogecoin.createTransfer(
            'DEfUXm8EQjygL3v1yrNzDjw5HzZiVZPyvf',
            dogecoin.utils.amount('1000', 'doge'),
        )

        let suggestedFees = await transferNotEnoughFunds.getSuggestedFees()
        expect(suggestedFees.normal.enoughFunds).toBeFalsy()

        const transfer = await dogecoin.createTransfer(
            'DEfUXm8EQjygL3v1yrNzDjw5HzZiVZPyvf',
            dogecoin.utils.amount('1', 'doge'),
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
        const dogecoin = wallet.currency('dogecoin')

        const signature = await dogecoin.signMessage('Test')
        expect(signature).toMatchSnapshot()

        const address = await dogecoin.getAddress()
        expect(await dogecoin.utils.verifySignedMessage('Test', signature, address)).toBeTruthy()

        expect(await dogecoin.utils.verifySignedMessage('Invalid', signature, address)).toBeFalsy()
    })
})
