import {Secret} from '../../../entities/Secret/Secret'


export abstract class Keystore<KeystoreSecret extends Secret> {
    abstract checkPassword(password: string): Promise<boolean>
    abstract decrypt(password: string): Promise<KeystoreSecret>
}
