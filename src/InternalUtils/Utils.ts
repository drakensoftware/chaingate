export function remove0x(s: string) {
    return s.startsWith('0x') ? s.substring(2) : s
}

export function isHex(s: string): boolean {
    s = remove0x(s)
    return /\b(0x)?[0-9a-fA-F]+\b/.test(s)
}

export function hexToBytes(hex: string): Uint8Array {
    if (!isHex(hex)) throw new Error('Invalid hexadecimal value')
    const hexWithout0x = remove0x(hex)
    const length = hexWithout0x.length
    const bytes = new Uint8Array(length / 2)
    for (let i = 0; i < length; i += 2) {
        bytes[i / 2] = parseInt(hexWithout0x.substring(i, i + 2), 16)
    }
    return bytes
}

export function bytesToHex(bytes: Uint8Array, use0x: boolean): string {
    return (
        (use0x ? '0x' : '') +
        Array.from(bytes)
            .map((b) => b.toString(16).padStart(2, '0'))
            .join('')
    )
}

export function generateSecureRandomBytes(length: number): Uint8Array {
    const randomBytes = new Uint8Array(length)
    crypto.getRandomValues(randomBytes)
    return randomBytes
}

export function buildUrlWithApiKey(baseUrl: string, apiKey?: string) {
    const url = new URL(baseUrl)
    if (apiKey) url.searchParams.append('apiKey', apiKey)
    return url.toString()
}

export function isBase58(base58: string): boolean {
    return /^[A-HJ-NP-Za-km-z1-9]+$/.test(base58)
}

export function recordToMap<K extends string, V>(record: Record<K, V>): Map<K, V> {
    // Convert record to an array of [key, value] pairs, then pass to new Map
    return new Map<K, V>(Object.entries(record) as [K, V][])
}

export function mapToRecord<K extends string, V>(map: Map<K, V>): Record<K, V> {
    const record: Record<K, V> = {} as Record<K, V>
    for (const [key, value] of map) {
        record[key] = value
    }
    return record
}

export function transformMap<K, V, U>(
    originalMap: Map<K, V>,
    transformFn: (value: V, key: K) => U,
): Map<K, U> {
    const newMap = new Map<K, U>()

    // `Map.forEach` provides (value, key)
    originalMap.forEach((value, key) => {
        newMap.set(key, transformFn(value, key))
    })

    return newMap
}
