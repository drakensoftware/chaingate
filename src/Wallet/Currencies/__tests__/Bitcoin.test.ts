import {AddressType} from '../Bitcoin/BitcoinUtils'
import {NotEnoughFundsError} from '../Currency'
import * as InitializeWallet from '../../InitializeWallet'

describe('Bitcoin', function () {
    it('Generate addresses of different types', async () => {
        process.env.I_AM_SURE_I_AM_NOT_IN_PRODUCTION = String(true)

        const mnemonic = 'abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon about'
        const wallet = await InitializeWallet.fromPhrase('', mnemonic)
        const bitcoin = wallet.currencies.bitcoin

        expect(await bitcoin.getAddress())
            .toBe('bc1qcr8te4kr609gcawutmrza0j4xv80jy8z306fyu')

        expect(await bitcoin.getAddressOfType(AddressType.WitnessPubKeyHash))
            .toBe('bc1qcr8te4kr609gcawutmrza0j4xv80jy8z306fyu')

        await bitcoin.setDerivationPath('m/44\'/0\'/0\'/0/0')
        expect(await bitcoin.getAddressOfType(AddressType.PubKeyHash))
            .toBe('1LqBGSKuX5yYUonjxT5qGfpUsXKYYWeabA')

        await bitcoin.setDerivationPath('m/86\'/0\'/0\'/0/0')
        expect(await bitcoin.getAddressOfType(AddressType.TapRoot))
            .toBe('bc1p5cyxnuxmeuwuvkwfem96lqzszd02n6xdcjrs20cac6yqjjwudpxqkedrcr')

        await expect(bitcoin.getAddressOfType(AddressType.ScriptHash)).rejects.toThrow()
        await expect(bitcoin.getAddressOfType(AddressType.WitnessScriptHash)).rejects.toThrow()
    })

    it('Get address balance', async () => {
        process.env.I_AM_SURE_I_AM_NOT_IN_PRODUCTION = String(true)

        const mnemonic = 'abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon about'
        const wallet = await InitializeWallet.fromPhrase('', mnemonic)
        const bitcoin = wallet.currencies.bitcoin


        expect(await bitcoin.getAddress()).toBe('bc1qcr8te4kr609gcawutmrza0j4xv80jy8z306fyu')

        const balance = await bitcoin.getBalance()
        expect(balance.confirmed.baseAmount.toNumber()).toBe(0)
        expect(balance.unconfirmed.baseAmount.toNumber()).toBe(0)
    })

    it('Transfer some bitcoins', async () => {
        process.env.I_AM_SURE_I_AM_NOT_IN_PRODUCTION = String(true)

        const mnemonic = 'zero sun street chronic online omit buzz critic south sample video drastic base provide cream'
        const wallet = await InitializeWallet.fromPhrase('', mnemonic)
        const bitcoin = wallet.currencies.bitcoin

        expect(await bitcoin.getAddress()).toBe('bc1ql0gj7t80sxgg5x9s5ft4wsdehhd8rhrpmtfg09')

        const preparedTransfer = await bitcoin.prepareTransfer('bc1qv0tvnnvssfqaglmms6tmpwnrl3rq2mrjvq2z7k', bitcoin.amount('0.00039'))
        expect(preparedTransfer.possibleFees).toMatchSnapshot()
        const result = await preparedTransfer.confirm('normal')
        expect(result.txId).toBe('619e19924cce832c08e648624b4bcd3e5c21f6daf9c24c65042b4904083cb645')
        await result.waitToBeConfirmed()
        expect(await result.isConfirmed()).toBeTruthy()
    })

    it('Transfer some bitcoins (not enough funds)', async () => {
        process.env.I_AM_SURE_I_AM_NOT_IN_PRODUCTION = String(true)

        const mnemonic = 'zero sun street chronic online omit buzz critic south sample video drastic base provide cream'
        const wallet = await InitializeWallet.fromPhrase('', mnemonic)
        const bitcoin = wallet.currencies.bitcoin

        expect(await bitcoin.getAddress()).toBe('bc1ql0gj7t80sxgg5x9s5ft4wsdehhd8rhrpmtfg09')

        await expect(async () =>
            await bitcoin.prepareTransfer('bc1qv0tvnnvssfqaglmms6tmpwnrl3rq2mrjvq2z7k', bitcoin.amount('1'))).rejects
            .toThrow(NotEnoughFundsError)
    })

})
