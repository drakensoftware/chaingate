import * as initializeWallet from '../../../../../InitializeWallet'
import { getTestApiKey, getTestPhrase } from '../../../../../TestUtils/TestUtils'

describe('Ethereum', function () {
    it('Generate addresses', async () => {
        const wallet = await initializeWallet.fromPhrase({
            phrase: getTestPhrase(),
            warnAboutUnencrypted: false,
        })
        const ethereum = wallet.currency('ethereum')

        expect(ethereum.utils.currencyInfo.defaultDerivationPath).toBe("m/44'/60'/0'/0/0")

        expect(await ethereum.getAddress()).toBe('0xE7c19D5A90352b5eE0144363D1191E2549Ca2146')
    })

    it('Get address balance', async () => {
        const wallet = await initializeWallet.fromPhrase({
            phrase: getTestPhrase(),
            warnAboutUnencrypted: false,
            apiKey: getTestApiKey(),
        })
        const ethereum = wallet.currency('ethereum')

        const balance = await ethereum.getBalance()
        expect(balance.confirmed.baseAmount.toString()).toMatchSnapshot()
        expect(balance.unconfirmed.baseAmount.toString()).toMatchSnapshot()
    })

    it('Transfer', async () => {
        const wallet = await initializeWallet.fromPhrase({
            phrase: getTestPhrase(),
            warnAboutUnencrypted: false,
            apiKey: getTestApiKey(),
        })
        const ethereum = wallet.currency('ethereum')

        const transferNotEnoughFunds = await ethereum.createTransfer(
            '0x1853be2c350EB9588bdC2Af73bDAA0C4B8Ac3583',
            ethereum.utils.amount('1', 'eth'),
        )

        let suggestedFees = await transferNotEnoughFunds.getSuggestedFees()
        expect(suggestedFees.normal.enoughFunds).toBeFalsy()

        const transfer = await ethereum.createTransfer(
            '0x1853be2c350EB9588bdC2Af73bDAA0C4B8Ac3583',
            ethereum.utils.amount('0.001', 'eth'),
        )

        suggestedFees = await transfer.getSuggestedFees()
        expect(suggestedFees.normal.enoughFunds).toBeTruthy()

        const broadcastedTransfer = await transfer.broadcast('normal')
        expect(broadcastedTransfer.transactionId).toMatchSnapshot()
    })

    it('Call smart contract function', async () => {
        const phrase =
            'zero sun street chronic online omit buzz critic south sample video drastic base provide cream'
        const wallet = await initializeWallet.fromPhrase({
            phrase,
            warnAboutUnencrypted: false,
            apiKey: getTestApiKey(),
        })
        const ethereum = wallet.currency('ethereum')

        expect(await ethereum.getAddress()).toBe('0xfF9810e98C9c0Fa3DDaB062413464A956aD87b31')

        const result = await ethereum.utils.callSmartContractRaw(
            '0x6b175474e89094c44da98b954eedeac495271d0f',
            '0x70a082310000000000000000000000006E0d01A76C3Cf4288372a29124A26D4353EE51BE',
        )

        expect(result).toMatchSnapshot()
    })

    it('Sign message', async () => {
        const wallet = await initializeWallet.fromPhrase({
            phrase: getTestPhrase(),
            warnAboutUnencrypted: false,
            apiKey: getTestApiKey(),
        })
        const ethereum = wallet.currency('ethereum')

        const signature = await ethereum.signMessage('Test')
        expect(signature).toMatchSnapshot()

        const address = await ethereum.getAddress()
        expect(await ethereum.utils.verifySignedMessage('Test', signature, address)).toBeTruthy()

        expect(await ethereum.utils.verifySignedMessage('Invalid', signature, address)).toBeFalsy()
    })
})
