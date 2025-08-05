import { getTestApiKey, getTestPhrase } from '../../../../../TestUtils/TestUtils'
import * as initializeWallet from '../../../../../InitializeWallet'

describe('Bitcoin Cash', function () {
    it('Generate addresses', async () => {
        const wallet = await initializeWallet.fromPhrase({
            phrase: getTestPhrase(),
            warnAboutUnencrypted: false,
        })
        const bitcoinCash = wallet.currency('bitcoinCash')

        expect(bitcoinCash.utils.currencyInfo.defaultDerivationPath).toBe("m/44'/145'/0'/0/0")

        expect(await bitcoinCash.getAddress()).toBe(
            'bitcoincash:qrt7fjrlh7eyqnsrpc0drzrdsyu7wdhmlguvqwz4lk',
        )
        expect(await bitcoinCash.getAddress('cashaddr')).toBe(
            'bitcoincash:qrt7fjrlh7eyqnsrpc0drzrdsyu7wdhmlguvqwz4lk',
        )
        expect(await bitcoinCash.getAddress('legacy')).toBe('1LgYMNydv74dHHK8BhRteV3pcpAFZLCgdt')
    })

    it('Get address balance', async () => {
        const wallet = await initializeWallet.fromPhrase({
            phrase: getTestPhrase(),
            warnAboutUnencrypted: false,
            apiKey: getTestApiKey(),
        })
        const bitcoinCash = wallet.currency('bitcoinCash')

        const balance = await bitcoinCash.getBalance()
        expect(balance.confirmed.baseAmount.toString()).toMatchSnapshot()
        expect(balance.unconfirmed.baseAmount.toString()).toMatchSnapshot()
    })

    it('Transfer', async () => {
        const wallet = await initializeWallet.fromPhrase({
            phrase: getTestPhrase(),
            warnAboutUnencrypted: false,
            apiKey: getTestApiKey(),
        })

        const bitcoinCash = wallet.currency('bitcoinCash')

        const transferNotEnoughFunds = await bitcoinCash.createTransfer(
            'bitcoincash:qq5e70rwvh6c6qqcspljp7ef9pfzzxdf6qwgh85w7k',
            bitcoinCash.utils.amount('1', 'bch'),
        )

        let suggestedFees = await transferNotEnoughFunds.getSuggestedFees()
        expect(suggestedFees.normal.enoughFunds).toBeFalsy()

        const transfer = await bitcoinCash.createTransfer(
            'bitcoincash:qq5e70rwvh6c6qqcspljp7ef9pfzzxdf6qwgh85w7k',
            bitcoinCash.utils.amount('0.0004', 'bch'),
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
        const bitcoinCash = wallet.currency('bitcoinCash')

        const signature = await bitcoinCash.signMessage('Test')
        expect(signature).toMatchSnapshot()

        const address = await bitcoinCash.getAddress()
        expect(await bitcoinCash.utils.verifySignedMessage('Test', signature, address)).toBeTruthy()

        expect(
            await bitcoinCash.utils.verifySignedMessage('Invalid', signature, address),
        ).toBeFalsy()
    })
})
