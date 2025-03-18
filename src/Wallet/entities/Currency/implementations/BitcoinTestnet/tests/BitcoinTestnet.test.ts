import * as initializeWallet from '../../../../../../InitializeWallet'
import {getTestPhrase} from '../../../../../../Utils/TestUtils'

describe('Bitcoin Testnet', function () {
    it('Generate addresses', async () => {
        const wallet = await initializeWallet.fromPhrase({phrase: getTestPhrase(), warnAboutUnencrypted: false})
        const bitcoin = wallet.currency('bitcoinTestnet')

        expect(bitcoin.currencyInfo.defaultDerivationPath).toBe('m/84\'/1\'/0\'/0/0')
        expect(await bitcoin.getAddress())
            .toBe('tb1qq7vl6uc3wp0k3nrehnf9l392acmh7vxwawss73')

        bitcoin.setDerivationPath('m/86\'/1\'/0\'/0/0')
        expect(await bitcoin.getAddress('taproot'))
            .toBe('tb1pqxq7tdnh04sc7tjzfgqfz3a9vj0clvk49fjsdmrlrrv953c9kfcsw5uajn')

        // Legacy
        bitcoin.setDerivationPath('m/44\'/1\'/0\'/0/0')
        expect(await bitcoin.getAddress('legacy'))
            .toBe('mj3v1VqG2PWr3C62cj1hHwNW9k2PjkrV6m')

        // Segwit
        bitcoin.setDerivationPath('m/84\'/1\'/0\'/0/0')
        expect(await bitcoin.getAddress('segwit'))
            .toBe('tb1qq7vl6uc3wp0k3nrehnf9l392acmh7vxwawss73')
    })

    it('Get address balance', async () => {
        const wallet = await initializeWallet.fromPhrase({phrase: getTestPhrase(), warnAboutUnencrypted: false})
        const bitcoin = wallet.currency('bitcoinTestnet')

        const balance = await bitcoin.getBalance()
        expect(balance.confirmed.baseAmount.toString()).toBe('0.00047419')
        expect(balance.unconfirmed.baseAmount.toString()).toBe('0')
    })

    it('Transfer', async () => {
        const wallet = await initializeWallet.fromPhrase({phrase: getTestPhrase(), warnAboutUnencrypted: false})

        const bitcoin = wallet.currency('bitcoinTestnet')

        const transferNotEnoughFunds = await bitcoin.createTransfer(
            'tb1qkshdpuwr4mexg3p44um47mnvzywsjmttrng7sg',
            await bitcoin.amount('1', 'btc')
        )

        let suggestedFees = await transferNotEnoughFunds.getSuggestedFees()
        expect(suggestedFees.normal.enoughFunds).toBeFalsy()

        const transfer = await bitcoin.createTransfer(
            'tb1qkshdpuwr4mexg3p44um47mnvzywsjmttrng7sg',
            await bitcoin.amount('0.000005', 'btc')
        )

        suggestedFees = await transfer.getSuggestedFees()
        expect(suggestedFees.normal.enoughFunds).toBeTruthy()

        const broadcastedTransfer = await transfer.broadcast('normal')
        expect(broadcastedTransfer.txId).toBe('f3b3efc9dd5b5e27d9489c723d8a0bc6fc57b0da4f1fbd78bd9262f80903ab8b')
    })
})
