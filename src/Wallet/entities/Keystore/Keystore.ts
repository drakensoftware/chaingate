export abstract class Keystore {
    abstract checkPassword(password: string): Promise<boolean>
    abstract decrypt(password: string): Promise<Uint8Array>
}
