import {setupCryptoGetRandomValuesMock} from '../../Utils/TestUtils'
import * as initializeWallet from '../../InitializeWallet'
import {PhraseWallet} from '../implementations/PhraseWallet/PhraseWallet'
import {SeedWallet} from '../implementations/SeedWallet/SeedWallet'
import {PrivateKeyWallet} from '../implementations/PrivateKeyWallet/PrivateKeyWallet'

setupCryptoGetRandomValuesMock()

describe('Wallet', () => {
    it('serialization should match snapshot', async () => {
        const wallet = await initializeWallet.fromPhrase({phrase: 'abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon about',
            // eslint-disable-next-line @typescript-eslint/no-unused-vars
            encrypt: {password: '1234', askForPassword: async (_attempts, _reject) => {return '1234'}}})
        expect(await wallet.serialize()).toMatchSnapshot()
    })

    it('should create an encrypted wallet, serialize/deserialize it, and manage addresses correctly', async () => {
        const encrypt = {
            password: '',
            askForPassword: throwAskForPassword,
        }

        // Create
        const { wallet } = await initializeWallet.create({ encrypt })
        await checkSerialization(wallet)

        // From private key
        const wallet2 = await initializeWallet.fromPrivateKey({privateKey: '741745080050f2ce656aaa2a983a6b510caa706643e1ad05214feac6677ba657', encrypt})
        await checkSerialization(wallet2)

        // From seed
        const wallet3 = await initializeWallet.fromSeed({seed: '000102030405060708090a0b0c0d0e0f', encrypt})
        await checkSerialization(wallet3)

        // From phrase
        const wallet4 = await initializeWallet.fromPhrase({phrase: 'abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon about', encrypt})
        await checkSerialization(wallet4)

    })
})

// eslint-disable-next-line @typescript-eslint/no-unused-vars
async function throwAskForPassword (_attempts: number, _reject: () => void) : Promise<string> {
    throw new Error('Password prompt not implemented')
}

async function checkSerialization(wallet: PhraseWallet | SeedWallet | PrivateKeyWallet) {

    // Access the Bitcoin currency
    const btc = wallet.currency('bitcoin')

    // Getting address
    await btc.getAddress()

    // Serialize the wallet
    const serializedData = await wallet.serialize()

    // Deserialize into a new wallet instance
    const deserializedWallet = (await initializeWallet.deserialize({
        serialized: serializedData,
        askForPassword: throwAskForPassword,
    }))

    // Access Bitcoin again on the deserialized wallet
    const btcDeserialized = deserializedWallet.currency('bitcoin')
    await btcDeserialized.getAddress()

    // Change derivation path to something not cached and expect it to throw
    if(deserializedWallet instanceof PhraseWallet || deserializedWallet instanceof SeedWallet){
        const btcDeserialized = deserializedWallet.currency('bitcoin')
        btcDeserialized.setDerivationPath('m/0/0')
        await expect(() => btcDeserialized.getAddress()).rejects.toThrow()
    }
}
