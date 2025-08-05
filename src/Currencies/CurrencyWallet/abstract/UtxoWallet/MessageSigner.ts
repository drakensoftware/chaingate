import * as secp from '@noble/secp256k1'
import { sha256 } from '@noble/hashes/sha256'
import { PrivateKey } from '../../../../Wallet/entities/Secret/implementations/PrivateKey'

function encodeVarInt(n: number): Uint8Array {
    if (n < 0xfd) {
        return Uint8Array.of(n)
    } else if (n <= 0xffff) {
        return Uint8Array.of(0xfd, n & 0xff, (n >> 8) & 0xff)
    } else if (n <= 0xffffffff) {
        return Uint8Array.of(0xfe, n & 0xff, (n >> 8) & 0xff, (n >> 16) & 0xff, (n >> 24) & 0xff)
    } else {
        throw new Error('Message too long')
    }
}

function magicHash(
    message: Uint8Array | string,
    prefix: string = '\x18Bitcoin Signed Message:\n',
): Uint8Array {
    const prefixBytes = new TextEncoder().encode(prefix)
    // Use byte length of prefix, not character length
    const prefixLen = encodeVarInt(prefixBytes.length)

    // Handle both string and Uint8Array message types
    let messageBytes: Uint8Array
    let msgLen: Uint8Array

    if (typeof message === 'string') {
        messageBytes = new TextEncoder().encode(message)
        // For strings, use the byte length (UTF-8 encoded length)
        msgLen = encodeVarInt(messageBytes.length)
    } else {
        messageBytes = message
        msgLen = encodeVarInt(message.length)
    }

    const payload = new Uint8Array([...prefixLen, ...prefixBytes, ...msgLen, ...messageBytes])

    return sha256(sha256(payload))
}

export async function signMessage(
    message: Uint8Array | string,
    privateKey: PrivateKey,
    prefix: string = '\x18Bitcoin Signed Message:\n',
): Promise<string> {
    const hash = magicHash(message, prefix)

    // Sign with lowS option for canonical signatures
    const signature = await secp.signAsync(hash, privateKey.hex, { lowS: true })

    // Get expected public key (compressed)
    const expectedPubKey = secp.getPublicKey(privateKey.hex, true)

    // Try each recovery ID to find the correct one
    for (let recoveryId = 0; recoveryId < 4; recoveryId++) {
        const recoveredPubKey = signature.addRecoveryBit(recoveryId).recoverPublicKey(hash)
        const recoveredBytes = recoveredPubKey.toRawBytes(true)

        // Compare the recovered public key with expected
        if (
            recoveredBytes.length === expectedPubKey.length &&
            recoveredBytes.every((byte, i) => byte === expectedPubKey[i])
        ) {
            const sigBytes = signature.toCompactRawBytes()

            // Use 31 for compressed keys (Bitcoin standard)
            const recoveryFlag = 31 + recoveryId
            const fullSig = new Uint8Array([recoveryFlag, ...sigBytes])

            return btoa(String.fromCharCode(...fullSig))
        }
    }

    throw new Error('Could not create recoverable signature')
}

export async function getSignedMessagePublicKey(
    message: Uint8Array | string,
    signature: string,
    prefix: string = '\x18Bitcoin Signed Message:\n',
): Promise<Uint8Array> {
    try {
        const hash = magicHash(message, prefix)

        // Decode base64 signature
        const sigBytes = Uint8Array.from(atob(signature), (c) => c.charCodeAt(0))

        if (sigBytes.length !== 65) {
            throw new Error('Invalid signature length')
        }

        const recoveryFlag = sigBytes[0]
        const signatureData = sigBytes.slice(1)

        // Determine if compressed based on recovery flag
        const isCompressed = recoveryFlag >= 31
        const recoveryId = isCompressed ? recoveryFlag - 31 : recoveryFlag - 27

        if (recoveryId < 0 || recoveryId > 3) {
            throw new Error('Invalid recovery ID')
        }

        // Create signature object
        const sig = secp.Signature.fromCompact(signatureData).addRecoveryBit(recoveryId)

        // Recover public key
        const recoveredPubKey = sig.recoverPublicKey(hash)
        return recoveredPubKey.toRawBytes(isCompressed)
    } catch (error) {
        if (error instanceof Error) {
            throw new Error(`Invalid signature: ${error.message}`)
        }
        throw new Error('Invalid signature')
    }
}
