import IncorrectPassword from '../Crypto/KeystoreDecoder/IncorrectPassword'
import {EncodingError} from '../InitializeWallet'
import * as InitializeWallet from '../InitializeWallet'
import {WalletIsEncrypted} from '../Keys/Ecryptable'

beforeEach(() => {
    jest.spyOn(global.crypto, 'getRandomValues').mockImplementation((buffer) => {
        const n = buffer as Uint8Array
        n.fill(0x00)
        return n
    })
})

afterEach(() => {
    jest.spyOn(global.crypto, 'getRandomValues').mockRestore()
})

//https://github.com/trezor/python-mnemonic/blob/master/vectors.json


describe('Wallet', () => {

    it('Wallet encryption', async () => {
        process.env.I_AM_SURE_I_AM_NOT_IN_PRODUCTION = String(true)

        const wallet = await InitializeWallet.fromPhrase('', 'abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon about')
        await wallet.encrypt('Fake password')
        expect(wallet.isEncrypted).toBeTruthy()

        await wallet.runUnencrypted('Fake password', async () => {
            const seed = await wallet.getSeed()
            expect(seed.hexa).toBe(
                '5eb00bbddcf069084889a8ab9155568165f5c453' +
                'ccb85e70811aaed6f6da5fc19a5ac40b389cd370' +
                'd086206dec8aa6c43daea6690f20ad3d8d48b2d2' +
                'ce9e38e4')
        })

        await expect(async () => wallet.Phrase).rejects.toThrow(WalletIsEncrypted)
    })



    it('Wallet from phrase (English)', async () => {
        process.env.I_AM_SURE_I_AM_NOT_IN_PRODUCTION = String(true)
        const wallet = await InitializeWallet.fromPhrase('',
            'abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon about')

        const seed = await wallet.getSeed()
        expect(seed.hexa).toBe(
            '5eb00bbddcf069084889a8ab9155568165f5c453' +
            'ccb85e70811aaed6f6da5fc19a5ac40b389cd370' +
            'd086206dec8aa6c43daea6690f20ad3d8d48b2d2' +
            'ce9e38e4')
        expect(seed.xpriv).toBe(
            'xprv9s21ZrQH143K3GJpoapnV8SFfukcVBSfeCficPSGfubmSFDxo1kuHnLisriDvSnRRuL2Qrg5ggqHKNVpxR86QEC8w35uxmGoggxtQTPvfUu')
    })

    it('Wallet from phrase (Chinese)', async () => {
        process.env.I_AM_SURE_I_AM_NOT_IN_PRODUCTION = String(true)
        const wallet = await InitializeWallet.fromPhrase('',
            '的 的 的 的 的 的 的 的 的 的 的 的 的 的 的 的 的 动')

        const seed = await wallet.getSeed()
        expect(seed.hexa).toBe(
            '87a89b5145f00cc0dee954940deec9c6606bc61a5d34f7c0e4fadb46ac35665317f47ca3f2e57f451dde0fd96c6a4d06a51c6fbb9317da2fa80ffa66dda3aefc')
        expect(seed.xpriv).toBe(
            'xprv9s21ZrQH143K33GSJBSLkyd6JaaKcwsVKMMRKrHJvh6q4UeSvoYs3nJaTkBywwSYHZ4SrZi5kTamxHWHJMaWZnrE3zP3vCXBa1ArMa8hJQq'
        )
    })

    it('Invalid phrase', async () => {
        await expect(async () => await InitializeWallet.fromPhrase('',
            'state small satisfied budge ant provision pause clue still shrink score chemistry')).rejects.toThrow(EncodingError)
    })


    it('Wallet from seed', async () => {
        process.env.I_AM_SURE_I_AM_NOT_IN_PRODUCTION = String(true)
        const wallet = await InitializeWallet.fromSeed('', '000102030405060708090a0b0c0d0e0f')
        expect(wallet.Seed.xpriv).toBe('xprv9s21ZrQH143K3QTDL4LXw2F7HEK3wJUD2nW2nRk4stbPy6cq3jPPqjiChkVvvNKmPGJxWUtg6LnF5kejMRNNU3TGtRBeJgk33yuGBxrMPHi')
    })

    it('Invalid seed', async () => {
        await expect(async () => await InitializeWallet.fromSeed('',
            'Invalid hexadecimal')).rejects.toThrow(EncodingError)
    })

    it('Wallet from private key', async () => {
        process.env.I_AM_SURE_I_AM_NOT_IN_PRODUCTION = String(true)
        const wallet = await InitializeWallet.fromPrivateKey('', '741745080050f2ce656aaa2a983a6b510caa706643e1ad05214feac6677ba657')
        expect((wallet.PrivateKey).hexa).toBe('741745080050f2ce656aaa2a983a6b510caa706643e1ad05214feac6677ba657')
    })

    it('Invalid private key', async () => {
        await expect(async () => await InitializeWallet.fromPrivateKey('',
            'Invalid hexadecimal')).rejects.toThrow(EncodingError)
    })

    it('New wallet', async () => {
        process.env.I_AM_SURE_I_AM_NOT_IN_PRODUCTION = String(true)
        const wallet = await InitializeWallet.create('')
        const phrase = wallet.Phrase
        expect(phrase).toBe('abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon about')
    })

    it('New wallet with phrases in different languages', async () => {
        process.env.I_AM_SURE_I_AM_NOT_IN_PRODUCTION = String(true)

        let wallet = await InitializeWallet.create('', null)
        expect(wallet.Phrase).toBe(
            'abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon about')

        wallet = await InitializeWallet.create('', 'english')
        expect(wallet.Phrase).toBe(
            'abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon about')

        wallet = await InitializeWallet.create('', 'czech')
        expect(wallet.Phrase).toMatchSnapshot()

        wallet = await InitializeWallet.create('', 'french')
        expect(wallet.Phrase).toMatchSnapshot()

        wallet = await InitializeWallet.create('', 'italian')
        expect(wallet.Phrase).toMatchSnapshot()

        wallet = await InitializeWallet.create('', 'korean')
        expect(wallet.Phrase).toMatchSnapshot()

        wallet = await InitializeWallet.create('', 'japanese')
        expect(wallet.Phrase).toMatchSnapshot()

        wallet = await InitializeWallet.create('', 'portuguese')
        expect(wallet.Phrase).toMatchSnapshot()

        wallet = await InitializeWallet.create('', 'simplifiedChinese')
        expect(wallet.Phrase).toMatchSnapshot()

        wallet = await InitializeWallet.create('', 'spanish')
        expect(wallet.Phrase).toMatchSnapshot()

        wallet = await InitializeWallet.create('', 'traditionalChinese')
        expect(wallet.Phrase).toMatchSnapshot()
    })

    it('New wallet with different lengths', async () => {
        process.env.I_AM_SURE_I_AM_NOT_IN_PRODUCTION = String(true)

        let wallet = await InitializeWallet.create('', 'english', 12)
        expect(wallet.Phrase).toBe(
            'abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon about')

        wallet = await InitializeWallet.create('', 'english', 15)
        expect(wallet.Phrase).toMatchSnapshot()

        wallet = await InitializeWallet.create('', 'english', 18)
        expect(wallet.Phrase).toMatchSnapshot()

        wallet = await InitializeWallet.create('', 'english', 21)
        expect(wallet.Phrase).toMatchSnapshot()

        wallet = await InitializeWallet.create('', 'english', 24)
        expect(wallet.Phrase).toMatchSnapshot()

    })

    it('Import wallet from keystore (phrase v1 format)', async () => {
        process.env.I_AM_SURE_I_AM_NOT_IN_PRODUCTION = String(true)

        const keystore = '{"version":1,"crypto":{"cipher":"aes-128-ctr","cipherparams":{"iv":"00bee8a13b05a67c1c5dcdeaf461ee4a"},"ciphertext":"e96757767288314beb670abc4eddc40f1a36fc6f5812594d15c022aad88aff4d3a998501884b752bca0967f4c2dc6d9dabf922fd056cefa8cbc5b04a7beb64ae4f93b4af4c7543c8e83699","kdf":"pbkdf2","kdfparams":{"c":262144,"prf":"hmac-sha256","dklen":32,"salt":"da46c078f9657ecec39e9bddee7def09f37e06025c1eceb2b9412454800814db"},"mac":"3e56e57d5fcc6873f9c09e29e1a76f6f1f1c8a534f51f164ef2064607fb136c6"}}'
        await expect(async () => await InitializeWallet.fromKeystore('', keystore, 'Incorrect password')).rejects.toThrow(IncorrectPassword)
        const wallet = await InitializeWallet.fromKeystore('', keystore, '1234')
        expect(await wallet.currencies.bitcoin.getAddress()).toBe('bc1qu3c79ddecg67uazedwng6s2u9zn79mhhumgngk')
    })

    it('Import wallet from keystore (geth format)', async () => {
        process.env.I_AM_SURE_I_AM_NOT_IN_PRODUCTION = String(true)

        const keystore = '{"address":"014c1c3a420c781061a8decc2f3e00cda1c59816","crypto":{"cipher":"aes-128-ctr","ciphertext":"6b35eafed8217cb2bda7d57f7e165e26caedb653defbf83deed4acbb3b47609e","cipherparams":{"iv":"be2065014801e9264e114c32728c7c09"},"kdf":"scrypt","kdfparams":{"dklen":32,"n":262144,"p":1,"r":8,"salt":"a109b4a90baa55fe59c47a9915de0dd91a357e1ba02b26234a5fe2b8cbcceca2"},"mac":"8905d186d71c6fd6e2df02f4bc3233a46f38aedba5dc55b6c4efe0fbf87979e6"},"id":"39a6290e-f719-4339-9b0f-97fb7ed3e4b4","version":3}'
        await expect(async () => await InitializeWallet.fromKeystore('', keystore, 'Incorrect password')).rejects.toThrow(IncorrectPassword)
        const wallet = await InitializeWallet.fromKeystore('', keystore, '1234')
        expect(await wallet.currencies.ethereum.getAddress()).toBe('0x014c1C3A420c781061A8DECc2f3E00cda1C59816')
    })

    it('Get all balances', async () => {
        process.env.I_AM_SURE_I_AM_NOT_IN_PRODUCTION = String(true)

        const wallet = await InitializeWallet.fromPhrase('',
            'abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon about')
        expect(await wallet.getAllBalances()).toMatchSnapshot()
    })

})
