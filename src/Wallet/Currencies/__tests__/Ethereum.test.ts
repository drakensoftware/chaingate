import {NotEnoughFundsError} from '../Currency'
import * as InitializeWallet from '../../InitializeWallet'
import {Eth} from '../../Units'

describe('Ethereum', function () {
    it('Generate addresses of different types', async () => {
        process.env.I_AM_SURE_I_AM_NOT_IN_PRODUCTION = String(true)

        const mnemonic = 'abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon about'
        const wallet = await InitializeWallet.fromPhrase('abc', mnemonic)

        expect(await wallet.currencies.ethereum.getAddress())
            .toBe('0x9858EfFD232B4033E47d90003D41EC34EcaEda94')
    })

    it('Get address balance', async () => {
        process.env.I_AM_SURE_I_AM_NOT_IN_PRODUCTION = String(true)

        const mnemonic = 'abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon about'
        const wallet = await InitializeWallet.fromPhrase('', mnemonic)

        expect(await wallet.currencies.ethereum.getAddress()).toBe('0x9858EfFD232B4033E47d90003D41EC34EcaEda94')

        const balance = await wallet.currencies.ethereum.getBalance()
        expect(balance.confirmed.eth.toString()).toBe('1.1909e-14')
        expect(balance.unconfirmed.eth.toNumber()).toBe(0)
    })

    it('Transfer some ethereum', async () => {
        process.env.I_AM_SURE_I_AM_NOT_IN_PRODUCTION = String(true)

        const mnemonic = 'zero sun street chronic online omit buzz critic south sample video drastic base provide cream'
        const wallet = await InitializeWallet.fromPhrase('', mnemonic)

        expect(await wallet.currencies.ethereum.getAddress()).toBe('0xfF9810e98C9c0Fa3DDaB062413464A956aD87b31')

        const balance = await wallet.currencies.ethereum.getBalance()
        expect(balance.confirmed.eth.toString()).toBe('0.032352785715404185')

        const transaction = await wallet.currencies.ethereum.prepareTransfer(
            '0x649Ac0b64Fe245783139f44344AD39a49f3B0E32', Eth('0.01'))
        expect(transaction.possibleFees).toMatchSnapshot()

        await transaction.confirm('normal')
    })

    it('Transfer some ethereum (not enough funds)', async () => {
        process.env.I_AM_SURE_I_AM_NOT_IN_PRODUCTION = String(true)

        const mnemonic = 'zero sun street chronic online omit buzz critic south sample video drastic base provide cream'
        const wallet = await InitializeWallet.fromPhrase('', mnemonic)

        expect(await wallet.currencies.ethereum.getAddress()).toBe('0xfF9810e98C9c0Fa3DDaB062413464A956aD87b31')

        await expect(async () =>
            await wallet.currencies.ethereum.prepareTransfer('0x649Ac0b64Fe245783139f44344AD39a49f3B0E32', Eth('1'))).rejects
            .toThrow(NotEnoughFundsError)
    })

    it('Call smart contract function', async () => {
        process.env.I_AM_SURE_I_AM_NOT_IN_PRODUCTION = String(true)

        const mnemonic = 'zero sun street chronic online omit buzz critic south sample video drastic base provide cream'
        const wallet = await InitializeWallet.fromPhrase('', mnemonic)

        expect(await wallet.currencies.ethereum.getAddress()).toBe('0xfF9810e98C9c0Fa3DDaB062413464A956aD87b31')

        const result = await wallet.currencies.ethereum.callSmartContractFunction(
            '0x6b175474e89094c44da98b954eedeac495271d0f',
            '0x70a082310000000000000000000000006E0d01A76C3Cf4288372a29124A26D4353EE51BE'
        )

        expect(result).toMatchSnapshot()
    })

})
