import {getTestPhrase} from '../../../../../../Utils/TestUtils'
import {initializeWallet} from '../../../../../../index'

describe('Bitcoin Cash', function () {
    it('Generate addresses', async () => {
        const wallet = await initializeWallet.fromPhrase({phrase: getTestPhrase(), warnAboutUnencrypted: false})
        const bitcoinCash = wallet.currency('bitcoinCash')

        expect(bitcoinCash.currencyInfo.defaultDerivationPath).toBe('m/44\'/145\'/0\'/0/0')

        expect(await bitcoinCash.getAddress()).toBe('bitcoincash:qrt7fjrlh7eyqnsrpc0drzrdsyu7wdhmlguvqwz4lk')
        expect(await bitcoinCash.getAddress('cashaddr')).toBe('bitcoincash:qrt7fjrlh7eyqnsrpc0drzrdsyu7wdhmlguvqwz4lk')
        expect(await bitcoinCash.getAddress('legacy')).toBe('1LgYMNydv74dHHK8BhRteV3pcpAFZLCgdt')
    })

    it('Get address balance', async () => {
        const wallet = await initializeWallet.fromPhrase({phrase: getTestPhrase(), warnAboutUnencrypted: false})
        const bitcoinCash = wallet.currency('bitcoinCash')

        const balance = await bitcoinCash.getBalance()
        expect(balance.confirmed.baseAmount.toString()).toBe('0.04580705')
        expect(balance.unconfirmed.baseAmount.toString()).toBe('0')
    })

    it('Transfer', async () => {
        const wallet = await initializeWallet.fromPhrase({phrase: getTestPhrase(), warnAboutUnencrypted: false})

        const bitcoinCash = wallet.currency('bitcoinCash')

        const transferNotEnoughFunds = await bitcoinCash.createTransfer(
            'bitcoincash:qq5e70rwvh6c6qqcspljp7ef9pfzzxdf6qwgh85w7k',
            await bitcoinCash.amount('1', 'bch')
        )

        let suggestedFees = await transferNotEnoughFunds.getSuggestedFees()
        expect(suggestedFees.normal.enoughFunds).toBeFalsy()

        const transfer = await bitcoinCash.createTransfer(
            'bitcoincash:qq5e70rwvh6c6qqcspljp7ef9pfzzxdf6qwgh85w7k',
            await bitcoinCash.amount('0.0004', 'bch')
        )

        suggestedFees = await transfer.getSuggestedFees()
        expect(suggestedFees.normal.enoughFunds).toBeTruthy()

        const broadcastedTransfer = await transfer.broadcast('normal')
        expect(broadcastedTransfer.txId).toBe('b9d1bec060ff6aa21ec74b8fa88c6058c5d3449371c7da5484a52e4f61c28147')
    })
})
