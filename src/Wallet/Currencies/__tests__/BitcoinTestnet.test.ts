import {AddressType} from '../Bitcoin/BitcoinUtils'
import {NotEnoughFundsError} from '../Currency'
import * as InitializeWallet from '../../InitializeWallet'

describe('Bitcoin Testnet', function () {
    it('Generate addresses of different types', async () => {
        process.env.I_AM_SURE_I_AM_NOT_IN_PRODUCTION = String(true)

        const mnemonic = 'abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon about'
        const wallet = await InitializeWallet.fromPhrase('', mnemonic)
        const bitcoin = wallet.currencies.bitcoinTestnet

        expect(await bitcoin.getAddress())
            .toBe('tb1q6rz28mcfaxtmd6v789l9rrlrusdprr9pqcpvkl')

        expect(await bitcoin.getAddressOfType(AddressType.WitnessPubKeyHash))
            .toBe('tb1q6rz28mcfaxtmd6v789l9rrlrusdprr9pqcpvkl')

        await bitcoin.setDerivationPath('m/44\'/1\'/0\'/0/0')
        expect(await bitcoin.getAddressOfType(AddressType.PubKeyHash))
            .toBe('mkpZhYtJu2r87Js3pDiWJDmPte2NRZ8bJV')

        await bitcoin.setDerivationPath('m/86\'/1\'/0\'/0/0')
        expect(await bitcoin.getAddressOfType(AddressType.TapRoot))
            .toBe('tb1p8wpt9v4frpf3tkn0srd97pksgsxc5hs52lafxwru9kgeephvs7rqlqt9zj')

        await expect(bitcoin.getAddressOfType(AddressType.ScriptHash)).rejects.toThrow()
        await expect(bitcoin.getAddressOfType(AddressType.WitnessScriptHash)).rejects.toThrow()
    })

    it('Get address balance', async () => {
        process.env.I_AM_SURE_I_AM_NOT_IN_PRODUCTION = String(true)

        const mnemonic = 'abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon about'
        const wallet = await InitializeWallet.fromPhrase('', mnemonic)
        const bitcoin = wallet.currencies.bitcoinTestnet


        expect(await bitcoin.getAddress()).toBe('tb1q6rz28mcfaxtmd6v789l9rrlrusdprr9pqcpvkl')

        const balance = await bitcoin.getBalance()
        expect(balance.confirmed.baseAmount.toNumber()).toBe(0)
        expect(balance.unconfirmed.baseAmount.toNumber()).toBe(0)
    })

    it('Transfer some bitcoins', async () => {
        process.env.I_AM_SURE_I_AM_NOT_IN_PRODUCTION = String(true)

        const mnemonic = 'zero sun street chronic online omit buzz critic south sample video drastic base provide cream'
        const wallet = await InitializeWallet.fromPhrase('', mnemonic)
        const bitcoin = wallet.currencies.bitcoinTestnet

        expect(await bitcoin.getAddress()).toBe('tb1q3dlgmncmjfykpas4cs9pu8l6f3mpn5q48whnkp')

        const preparedTransfer = await bitcoin.prepareTransfer('tb1qlj64u6fqutr0xue85kl55fx0gt4m4urun25p7q', bitcoin.amount('0.000001'))
        expect(preparedTransfer.possibleFees).toMatchSnapshot()
        const result = await preparedTransfer.confirm('normal')
        expect(result.txId).toBe('a81f16f79d371216eb2a14c7c3c4fa487090e75973c0d805fdf7bd4c75dc481c')
        await result.waitToBeConfirmed()
        expect(await result.isConfirmed()).toBeTruthy()
    })

    it('Transfer some bitcoins (not enough funds)', async () => {
        process.env.I_AM_SURE_I_AM_NOT_IN_PRODUCTION = String(true)

        const mnemonic = 'zero sun street chronic online omit buzz critic south sample video drastic base provide cream'
        const wallet = await InitializeWallet.fromPhrase('', mnemonic)
        const bitcoin = wallet.currencies.bitcoinTestnet

        expect(await bitcoin.getAddress()).toBe('tb1q3dlgmncmjfykpas4cs9pu8l6f3mpn5q48whnkp')

        await expect(async () =>
            await bitcoin.prepareTransfer('tb1qlj64u6fqutr0xue85kl55fx0gt4m4urun25p7q', bitcoin.amount('1'))).rejects
            .toThrow(NotEnoughFundsError)
    })

})
