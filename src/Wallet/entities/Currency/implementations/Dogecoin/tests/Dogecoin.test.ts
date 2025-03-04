import {getTestPhrase} from '../../../../../../Utils/TestUtils'
import {initializeWallet} from '../../../../../../index'

describe('Dogecoin', function () {
    it('Generate addresses', async () => {
        const wallet = await initializeWallet.fromPhrase({phrase: getTestPhrase(), warnAboutUnencrypted: false})
        const dogecoin = wallet.currency('dogecoin')

        expect(dogecoin.currencyInfo.defaultDerivationPath).toBe('m/44\'/3\'/0\'/0/0')

        expect(await dogecoin.getAddress())
            .toBe('DKjYavqdvAFLkvxVzFuks7De1Qho3Ashfy')
    })

    it('Get address balance', async () => {
        const wallet = await initializeWallet.fromPhrase({ phrase: getTestPhrase(), warnAboutUnencrypted: false})
        const dogecoin = wallet.currency('dogecoin')

        const balance = await dogecoin.getBalance()
        expect(balance.confirmed.baseAmount.toString()).toBe('55.14812068')
        expect(balance.unconfirmed.baseAmount.toString()).toBe('0')
    })

    it('Transfer', async () => {
        const wallet = await initializeWallet.fromPhrase({ phrase: getTestPhrase(), warnAboutUnencrypted: false})

        const dogecoin = wallet.currency('dogecoin')

        const transferNotEnoughFunds = await dogecoin.createTransfer(
            'DEfUXm8EQjygL3v1yrNzDjw5HzZiVZPyvf',
            await dogecoin.amount('1000', 'doge')
        )

        let suggestedFees = await transferNotEnoughFunds.getSuggestedFees()
        expect(suggestedFees.normal.enoughFunds).toBeFalsy()

        const transfer = await dogecoin.createTransfer(
            'DEfUXm8EQjygL3v1yrNzDjw5HzZiVZPyvf',
            await dogecoin.amount('1', 'doge')
        )

        suggestedFees = await transfer.getSuggestedFees()
        expect(suggestedFees.normal.enoughFunds).toBeTruthy()


        const broadcastedTransfer = await transfer.broadcast('normal')
        expect(broadcastedTransfer.txId).toBe('b8449e1a3470c20cbe4116c62ac01e025ddc4bc8b425e4ffef4f975d70931e7b')

    })
})