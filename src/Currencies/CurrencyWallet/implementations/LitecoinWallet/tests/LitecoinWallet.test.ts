import * as initializeWallet from '../../../../../InitializeWallet'
import { getTestApiKey, getTestPhrase } from '../../../../../TestUtils/TestUtils'

describe('Litecoin', function () {
    it('Generate addresses', async () => {
        const wallet = await initializeWallet.fromPhrase({
            phrase: getTestPhrase(),
            warnAboutUnencrypted: false,
        })
        const litecoin = wallet.currency('litecoin')

        expect(litecoin.utils.currencyInfo.defaultDerivationPath).toBe("m/84'/2'/0'/0/0")

        expect(await litecoin.getAddress()).toBe('ltc1qqj680mj4zw20ze56tljlwhtnwllwwzayraveyu')

        litecoin.setDerivationPath("m/86'/2'/0'/0/0")
        expect(await litecoin.getAddress('taproot-p2tr')).toBe(
            'ltc1p3u0xzj62e0da704c7agkwygjhzm4hddgz2glam5se407t4ralnmsc3ltcw',
        )

        // Legacy
        litecoin.setDerivationPath("m/44'/2'/0'/0/0")
        expect(await litecoin.getAddress('legacy-p2pkh')).toBe('LaXvFaji6NxzzuJisZ37avtKNHYpMm3zAw')

        // Segwit
        litecoin.setDerivationPath("m/84'/2'/0'/0/0")
        expect(await litecoin.getAddress('segwit-p2wpkh')).toBe(
            'ltc1qqj680mj4zw20ze56tljlwhtnwllwwzayraveyu',
        )
    })

    it('Get address balance', async () => {
        const wallet = await initializeWallet.fromPhrase({
            phrase: getTestPhrase(),
            warnAboutUnencrypted: false,
            apiKey: getTestApiKey(),
        })
        const litecoin = wallet.currency('litecoin')

        const balance = await litecoin.getBalance()
        expect(balance.confirmed.baseAmount.toString()).toMatchSnapshot()
        expect(balance.unconfirmed.baseAmount.toString()).toMatchSnapshot()
    })

    it('Transfer', async () => {
        const wallet = await initializeWallet.fromPhrase({
            phrase: getTestPhrase(),
            warnAboutUnencrypted: false,
            apiKey: getTestApiKey(),
        })

        const litecoin = wallet.currency('litecoin')

        const transferNotEnoughFunds = await litecoin.createTransfer(
            'ltc1qrddqs28h0dkf3d00lfu39w7czz5762tja9ast3',
            litecoin.utils.amount('1000', 'ltc'),
        )

        let suggestedFees = await transferNotEnoughFunds.getSuggestedFees()
        expect(suggestedFees.normal.enoughFunds).toBeFalsy()

        const transfer = await litecoin.createTransfer(
            'ltc1qrddqs28h0dkf3d00lfu39w7czz5762tja9ast3',
            litecoin.utils.amount('0.001', 'ltc'),
        )

        suggestedFees = await transfer.getSuggestedFees()
        expect(suggestedFees.normal.enoughFunds).toBeTruthy()

        const broadcastedTransfer = await transfer.broadcast('normal')
        expect(broadcastedTransfer.transactionId).toMatchSnapshot()
    })
})
