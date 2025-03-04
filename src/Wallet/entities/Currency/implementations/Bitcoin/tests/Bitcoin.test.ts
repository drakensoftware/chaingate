import {getTestPhrase} from '../../../../../../Utils/TestUtils'
import {initializeWallet} from '../../../../../../index'

describe('Bitcoin', function () {
    it('Generate addresses', async () => {
        const wallet = await initializeWallet.fromPhrase({phrase: getTestPhrase()})
        const bitcoin = wallet.currency('bitcoin')

        expect(bitcoin.currencyInfo.defaultDerivationPath).toBe('m/84\'/0\'/0\'/0/0')

        expect(await bitcoin.getAddress())
            .toBe('bc1qcu2aq327lzgee5f9vqm7m23fhck39ja7j37ass')

        bitcoin.setDerivationPath('m/86\'/0\'/0\'/0/0')
        expect(await bitcoin.getAddress('taproot'))
            .toBe('bc1ps6lm9t9yx6etly4y06hvqwyyzk4pc0j02w58s2frsgxlsh5hv47qvermj7')

        // Legacy
        bitcoin.setDerivationPath('m/44\'/0\'/0\'/0/0')
        expect(await bitcoin.getAddress('legacy'))
            .toBe('1BeH9f5U1N6nyvMwzzqyzEEGd2FaNReK9J')

        // Segwit
        bitcoin.setDerivationPath('m/84\'/0\'/0\'/0/0')
        expect(await bitcoin.getAddress('segwit'))
            .toBe('bc1qcu2aq327lzgee5f9vqm7m23fhck39ja7j37ass')
    })

    it('Get address balance', async () => {
        const wallet = await initializeWallet.fromPhrase({phrase: getTestPhrase()})
        const bitcoin = wallet.currency('bitcoin')

        const balance = await bitcoin.getBalance()
        expect(balance.confirmed.baseAmount.toString()).toBe('0.00020739')
        expect(balance.unconfirmed.baseAmount.toString()).toBe('0')
    })

    it('Transfer', async () => {
        const wallet = await initializeWallet.fromPhrase({phrase: getTestPhrase(), warnAboutUnencrypted: false})

        const bitcoin = wallet.currency('bitcoin')

        const transferNotEnoughFunds = await bitcoin.createTransfer(
            'bc1qv5r9mr7ajz2jh04d87c4nnhfjj0jqhm3z5v0hx',
            await bitcoin.amount('1', 'btc')
        )

        let suggestedFees = await transferNotEnoughFunds.getSuggestedFees()
        expect(suggestedFees.normal.enoughFunds).toBeFalsy()

        const transfer = await bitcoin.createTransfer(
            'bc1qv5r9mr7ajz2jh04d87c4nnhfjj0jqhm3z5v0hx',
            await bitcoin.amount('0.000005', 'btc')
        )

        suggestedFees = await transfer.getSuggestedFees()
        expect(suggestedFees.normal.enoughFunds).toBeTruthy()

        const broadcastedTransfer = await transfer.broadcast('normal')
        expect(broadcastedTransfer.txId).toBe('98f04fb1e708cc18525e49ad05b4d6055496a86f231b04bc132f2fd712d1f488')
    })
})
