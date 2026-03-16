/** Thrown when a mnemonic phrase is invalid. */
export class InvalidPhraseError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'InvalidPhraseError';
  }
}

/** Thrown when a private key has an invalid format. */
export class InvalidPrivateKeyError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'InvalidPrivateKeyError';
  }
}

/** Thrown when a seed value is invalid. */
export class InvalidSeedError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'InvalidSeedError';
  }
}

/** Thrown when a public key has an invalid format. */
export class InvalidPublicKeyError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'InvalidPublicKeyError';
  }
}

/** Thrown when the user cancels the password prompt during decryption. */
export class DecryptionCancelledError extends Error {
  constructor() {
    super('Decryption cancelled by user');
    this.name = 'DecryptionCancelledError';
  }
}

/** Thrown when calling {@link Secret.getEncryptedExport} on a non-encrypted secret. */
export class NotEncryptedError extends Error {
  constructor() {
    super('Secret is not encrypted');
    this.name = 'NotEncryptedError';
  }
}

/** Thrown when attempting to encrypt a secret that is already encrypted. */
export class AlreadyEncryptedError extends Error {
  constructor() {
    super('Already encrypted');
    this.name = 'AlreadyEncryptedError';
  }
}

/** Thrown when accessing secret data while encrypted. Use {@link Secret.withDecrypted} instead. */
export class EncryptedAccessError extends Error {
  constructor() {
    super('Cannot access secret data while encrypted. Use withDecrypted() to access it.');
    this.name = 'EncryptedAccessError';
  }
}

/** Thrown when HD key derivation produces a null value for a required property. */
export class HDKeyNullError extends Error {
  constructor(property: string) {
    super(`HDKey derivation produced null ${property}`);
    this.name = 'HDKeyNullError';
  }
}
