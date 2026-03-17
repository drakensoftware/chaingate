/**
 * Abstract base class for keystore decryption.
 *
 * A keystore is a JSON-encrypted container for a secret (typically a private
 * key or mnemonic phrase). Two formats are supported:
 * - **V1 (Legacy)**
 * - **V3 (Web3)**
 */
export abstract class Keystore {
  /**
   * Checks whether the provided password can decrypt this keystore.
   *
   * @param password - The password to verify.
   * @returns `true` if the password is correct.
   */
  abstract checkPassword(password: string): Promise<boolean>;

  /**
   * Decrypts the keystore and returns the raw secret bytes.
   *
   * @param password - The decryption password.
   * @throws {@link IncorrectKeystorePasswordError} if the password is wrong.
   */
  abstract decrypt(password: string): Promise<Uint8Array>;
}
