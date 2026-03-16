/**
 * Returns the test wallet mnemonic phrase from environment variables.
 *
 * Requires `DOTENV_PRIVATE_KEY_TEST` to be set so that `@dotenvx/dotenvx`
 * can decrypt the encrypted value in `.env.test`.
 */
export function getTestPhrase(): string {
  const phrase = process.env.TEST_PHRASE;
  if (!phrase || phrase.startsWith('encrypted:')) {
    throw new Error(
      'Missing or still-encrypted TEST_PHRASE environment variable. ' +
        'Set DOTENV_PRIVATE_KEY_TEST to decrypt .env.test.',
    );
  }
  return phrase;
}

/**
 * Returns the ChainGate API key for tests.
 *
 * Falls back to an empty string when the variable is unavailable (e.g. when
 * running against pre-recorded Polly sessions).
 */
export function getTestApiKey(): string {
  const key = process.env.TEST_API_KEY;
  if (!key || key.startsWith('encrypted:')) {
    return '';
  }
  return key;
}
