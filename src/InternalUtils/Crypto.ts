import { pbkdf2Async } from '@noble/hashes/pbkdf2'
import { sha256 } from '@noble/hashes/sha256'

type pbkdf2params = {
    password: string
    iterations: number
    dkLen: number
    salt: Uint8Array
}

export async function pbkdf2(params: pbkdf2params) {
    const subtleAvailable =
        !!global.crypto?.subtle?.importKey && !!global.crypto?.subtle?.deriveBits

    if (subtleAvailable) return await pbkdf2Subtle(params)
    else {
        console.warn(`  
          Your browser is using HTTP (not HTTPS), which:  
            • Disables native encryption acceleration  
            • Forces ~10× slower JavaScript fallback  
        
          Critical impacts:  
            → Encryption/decryption operations will be 10 times slower  
            → Sensitive data could be intercepted`)
        return await pbkdf2Async(sha256, params.password, params.salt, {
            c: params.iterations,
            dkLen: params.dkLen,
        })
    }
}

async function pbkdf2Subtle(params: pbkdf2params): Promise<Uint8Array> {
    // Setup key material for key derivation
    const deriveKeyMaterial = await crypto.subtle.importKey(
        'raw',
        new TextEncoder().encode(params.password),
        { name: 'PBKDF2' },
        false,
        ['deriveBits', 'deriveKey'],
    )

    // Derive the key
    const derivedKeyBits = await crypto.subtle.deriveBits(
        {
            name: 'PBKDF2',
            salt: new Uint8Array(params.salt),
            iterations: params.iterations,
            hash: 'SHA-256',
        },
        deriveKeyMaterial,
        params.dkLen * 8,
    )

    return new Uint8Array(derivedKeyBits)
}
