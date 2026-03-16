import { config as loadEnv } from '@dotenvx/dotenvx';
import { Polly } from '@pollyjs/core';
import FetchAdapter from '@pollyjs/adapter-fetch';
import FsPersister from '@pollyjs/persister-fs';
import path from 'path';
import { beforeEach, afterEach } from 'vitest';

// Load encrypted .env.test at runtime (requires DOTENV_PRIVATE_KEY_TEST to decrypt).
loadEnv({ path: '.env.test', quiet: true });

// Warn early if the decryption key is missing — tests will fail without it.
const phrase = process.env.TEST_PHRASE;
const apiKey = process.env.TEST_API_KEY;
if (!phrase || phrase.startsWith('encrypted:') || !apiKey || apiKey.startsWith('encrypted:')) {
  console.warn(
    '\n' +
      '╔══════════════════════════════════════════════════════════════════╗\n' +
      '║  DOTENV_PRIVATE_KEY_TEST is not set.                           ║\n' +
      '║  TEST_PHRASE and TEST_API_KEY could not be decrypted.          ║\n' +
      '║  Set DOTENV_PRIVATE_KEY_TEST to run the full test suite.       ║\n' +
      '╚══════════════════════════════════════════════════════════════════╝\n',
  );
}

// Register PollyJS adapters and persisters.
Polly.register(FetchAdapter);
Polly.register(FsPersister);

const recordingsDir = path.resolve(__dirname, '../recordings');

/** Remove the `api_key` query parameter from a URL string. */
function stripApiKeyFromUrl(url: string): string {
  try {
    const u = new URL(url);
    u.searchParams.delete('api_key');
    return u.toString();
  } catch {
    return url;
  }
}

let polly: Polly;

beforeEach(({ task }) => {
  const suiteName = task.suite?.name ?? 'global';
  const testName = task.name;

  const safeSuite = suiteName.replace(/\s+/g, '-').toLowerCase();
  const safeTest = testName.replace(/\s+/g, '-').toLowerCase();
  const recordingName = `${safeSuite}/${safeTest}`;

  polly = new Polly(recordingName, {
    adapters: ['fetch'],
    persister: 'fs',
    recordIfMissing: true,
    recordFailedRequests: true,
    logLevel: 'silent',
    matchRequestsBy: {
      headers: {
        exclude: ['x-api-key'],
      },
      url: {
        query(query) {
          // Ignore the api_key query param when matching requests to recordings.
          // eslint-disable-next-line @typescript-eslint/no-unused-vars
          const { api_key, ...rest } = query;
          return rest;
        },
      },
    },
    persisterOptions: {
      fs: {
        recordingsDir,
      },
    },
  });

  // Strip secrets from persisted recordings so they are never saved to disk.
  polly.server.any().on('beforePersist', (_req, recording) => {
    // Strip the x-api-key header.
    if (recording.request?.headers) {
      recording.request.headers = recording.request.headers.filter(
        (header: { name: string }) => header.name !== 'x-api-key',
      );
    }

    // Strip api_key from query string entries.
    if (recording.request?.queryString) {
      recording.request.queryString = recording.request.queryString.filter(
        (qs: { name: string }) => qs.name !== 'api_key',
      );
    }

    // Strip api_key from the persisted URL.
    if (recording.request?.url) {
      recording.request.url = stripApiKeyFromUrl(recording.request.url);
    }
  });
});

afterEach(async () => {
  await polly.stop();
});
