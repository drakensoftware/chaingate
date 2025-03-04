type TypedArray =
    | Int8Array
    | Uint8Array
    | Uint8ClampedArray
    | Int16Array
    | Uint16Array
    | Int32Array
    | Uint32Array
    | Float32Array
    | Float64Array;

export function setupCryptoGetRandomValuesMock(): void {
    beforeEach(() => {
        jest.spyOn(global.crypto, 'getRandomValues').mockImplementation(
            <T extends TypedArray>(array: T): T => {
                // Fill the array with zeros
                array.fill(0x00)
                return array
            }
        )
    })

    afterEach(() => {
        (global.crypto.getRandomValues as jest.Mock).mockRestore()
    })
}

export function getTestPhrase() {
    const testPhrase = process.env.TEST_PHRASE
    if (!testPhrase || testPhrase.startsWith('encrypted:')) {
        throw new Error(
            'Missing TEST_PHRASE environment variable. Please set TEST_PHRASE with the original phrase to run the tests.'
        )
    }
    return testPhrase
}
