import * as initializeWallet from '../../../../../../InitializeWallet'
import {getTestPhrase} from '../../../../../../Utils/TestUtils'

describe('Ethereum', function () {
    it('Generate addresses', async () => {
        const wallet = await initializeWallet.fromPhrase({phrase: getTestPhrase(), warnAboutUnencrypted: false})
        const ethereum = wallet.currency('ethereum')

        expect(ethereum.currencyInfo.defaultDerivationPath).toBe('m/44\'/60\'/0\'/0/0')

        expect(await ethereum.getAddress()).toBe('0xE7c19D5A90352b5eE0144363D1191E2549Ca2146')
    })

    it('Get address balance', async () => {
        const wallet = await initializeWallet.fromPhrase({phrase: getTestPhrase(), warnAboutUnencrypted: false})
        const ethereum = wallet.currency('ethereum')

        const balance = await ethereum.getBalance()
        expect(balance.confirmed.baseAmount.toString()).toBe('0.005')
        expect(balance.unconfirmed.baseAmount.toString()).toBe('0')
    })

    it('Transfer', async () => {
        const wallet = await initializeWallet.fromPhrase({phrase: getTestPhrase(), warnAboutUnencrypted: false})
        const ethereum = wallet.currency('ethereum')

        const transferNotEnoughFunds = await ethereum.createTransfer(
            '0x1853be2c350EB9588bdC2Af73bDAA0C4B8Ac3583',
            await ethereum.amount('1', 'eth')
        )

        let suggestedFees = await transferNotEnoughFunds.getSuggestedFees()
        expect(suggestedFees.normal.enoughFunds).toBeFalsy()

        const transfer = await ethereum.createTransfer(
            '0x1853be2c350EB9588bdC2Af73bDAA0C4B8Ac3583',
            await ethereum.amount('0.003', 'eth')
        )

        suggestedFees = await transfer.getSuggestedFees()
        expect(suggestedFees.normal.enoughFunds).toBeTruthy()

        const broadcastedTransfer = await transfer.broadcast('normal')
        expect(broadcastedTransfer.txId).toBe('0x72e6d74b1cdbca9db0f8ac174a3aa09b45ffb59f53fd2431990d3573c2266bae')
    })

    it('Call smart contract function', async () => {
        const phrase = 'zero sun street chronic online omit buzz critic south sample video drastic base provide cream'
        const wallet = await initializeWallet.fromPhrase({phrase, warnAboutUnencrypted: false})
        const ethereum = wallet.currency('ethereum')

        expect(await ethereum.getAddress()).toBe('0xfF9810e98C9c0Fa3DDaB062413464A956aD87b31')

        const result = await ethereum.callSmartContractRaw(
            '0x6b175474e89094c44da98b954eedeac495271d0f',
            '0x70a082310000000000000000000000006E0d01A76C3Cf4288372a29124A26D4353EE51BE'
        )

        expect(result).toMatchSnapshot()
    })

})
