import * as initializeWallet from '../../../../../InitializeWallet'
import { getTestApiKey, getTestPhrase } from '../../../../../TestUtils/TestUtils'

describe('Bitcoin Testnet', function () {
    it('Generate addresses', async () => {
        const wallet = await initializeWallet.fromPhrase({
            phrase: getTestPhrase(),
            warnAboutUnencrypted: false,
        })
        const bitcoin = wallet.currency('bitcoinTestnet')

        expect(bitcoin.utils.currencyInfo.defaultDerivationPath).toBe("m/84'/1'/0'/0/0")
        expect(await bitcoin.getAddress()).toBe('tb1qq7vl6uc3wp0k3nrehnf9l392acmh7vxwawss73')

        bitcoin.setDerivationPath("m/86'/1'/0'/0/0")
        expect(await bitcoin.getAddress('taproot-p2tr')).toBe(
            'tb1pqxq7tdnh04sc7tjzfgqfz3a9vj0clvk49fjsdmrlrrv953c9kfcsw5uajn',
        )

        // Legacy
        bitcoin.setDerivationPath("m/44'/1'/0'/0/0")
        expect(await bitcoin.getAddress('legacy-p2pkh')).toBe('mj3v1VqG2PWr3C62cj1hHwNW9k2PjkrV6m')

        // Segwit
        bitcoin.setDerivationPath("m/84'/1'/0'/0/0")
        expect(await bitcoin.getAddress('segwit-p2wpkh')).toBe(
            'tb1qq7vl6uc3wp0k3nrehnf9l392acmh7vxwawss73',
        )
    })

    it('Get address balance', async () => {
        const wallet = await initializeWallet.fromPhrase({
            phrase: getTestPhrase(),
            warnAboutUnencrypted: false,
            apiKey: getTestApiKey(),
        })
        const bitcoin = wallet.currency('bitcoinTestnet')

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

        const bitcoin = wallet.currency('bitcoinTestnet')

        const transferNotEnoughFunds = await bitcoin.createTransfer(
            'tb1qkshdpuwr4mexg3p44um47mnvzywsjmttrng7sg',
            bitcoin.utils.amount('1', 'btc'),
        )

        let suggestedFees = await transferNotEnoughFunds.getSuggestedFees()
        expect(suggestedFees.normal.enoughFunds).toBeFalsy()

        const transfer = await bitcoin.createTransfer(
            'tb1qkshdpuwr4mexg3p44um47mnvzywsjmttrng7sg',
            bitcoin.utils.amount('0.000005', 'btc'),
        )

        suggestedFees = await transfer.getSuggestedFees()
        expect(suggestedFees.normal.enoughFunds).toBeTruthy()

        const broadcastedTransfer = await transfer.broadcast('normal')
        expect(broadcastedTransfer.transactionId).toMatchSnapshot()
    })
})
