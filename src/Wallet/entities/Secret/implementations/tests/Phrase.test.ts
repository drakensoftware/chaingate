import { setupCryptoGetRandomValuesMock } from '../../../../../TestUtils/TestUtils'
import { Phrase, PhraseEncodingError } from '../Phrase'

setupCryptoGetRandomValuesMock()

describe('Phrase', () => {
    it('New phrase (English)', async () => {
        const phrase = await Phrase.new(
            'abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon about',
        )

        const seed = await phrase.getSeed()
        expect(seed.hex).toBe(
            '5eb00bbddcf069084889a8ab9155568165f5c453' +
                'ccb85e70811aaed6f6da5fc19a5ac40b389cd370' +
                'd086206dec8aa6c43daea6690f20ad3d8d48b2d2' +
                'ce9e38e4',
        )
    })

    it('New phrase (Chinese)', async () => {
        process.env.I_AM_SURE_I_AM_NOT_IN_PRODUCTION = String(true)
        const phrase = await Phrase.new('的 的 的 的 的 的 的 的 的 的 的 的 的 的 的 的 的 动')

        const seed = await phrase.getSeed()
        expect(seed.hex).toBe(
            '87a89b5145f00cc0dee954940deec9c6606bc61a5d34f7c0e4fadb46ac35665317f47ca3f2e57f451dde0fd96c6a4d06a51c6fbb9317da2fa80ffa66dda3aefc',
        )
    })

    it('Invalid phrase', async () => {
        await expect(
            Phrase.new(
                'state small satisfied budge ant provision pause clue still shrink score chemistry',
            ),
        ).rejects.toThrow(PhraseEncodingError)
    })

    it('New phrase with different languages', async () => {
        let phrase = Phrase.generateNewPhrase('english')
        expect(phrase).toMatchSnapshot()

        phrase = Phrase.generateNewPhrase('czech')
        expect(phrase).toMatchSnapshot()

        phrase = Phrase.generateNewPhrase('french')
        expect(phrase).toMatchSnapshot()

        phrase = Phrase.generateNewPhrase('italian')
        expect(phrase).toMatchSnapshot()

        phrase = Phrase.generateNewPhrase('korean')
        expect(phrase).toMatchSnapshot()

        phrase = Phrase.generateNewPhrase('japanese')
        expect(phrase).toMatchSnapshot()

        phrase = Phrase.generateNewPhrase('portuguese')
        expect(phrase).toMatchSnapshot()

        phrase = Phrase.generateNewPhrase('simplifiedChinese')
        expect(phrase).toMatchSnapshot()

        phrase = Phrase.generateNewPhrase('spanish')
        expect(phrase).toMatchSnapshot()

        phrase = Phrase.generateNewPhrase('traditionalChinese')
        expect(phrase).toMatchSnapshot()
    })

    it('New phrase with different lengths', async () => {
        let phrase = Phrase.generateNewPhrase('english', 15)
        expect(phrase).toMatchSnapshot()

        phrase = Phrase.generateNewPhrase('english', 18)
        expect(phrase).toMatchSnapshot()

        phrase = Phrase.generateNewPhrase('english', 21)
        expect(phrase).toMatchSnapshot()

        phrase = Phrase.generateNewPhrase('english', 24)
        expect(phrase).toMatchSnapshot()
    })
})
