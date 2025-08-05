// tests/setupPolly.auto.ts

import { Polly } from '@pollyjs/core'
import FetchAdapter from '@pollyjs/adapter-fetch'
import FsPersister from '@pollyjs/persister-fs'
import path from 'path'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

// Register PollyJS adapters and persisters
Polly.register(FetchAdapter)
Polly.register(FsPersister)

// Holds the Polly instance for each test
let polly: Polly

beforeEach(() => {
    // Get current test file and test name from Jest state
    const state = expect.getState()
    const testFile = path.basename(state.testPath || 'global', path.extname(state.testPath || ''))
    const testName = state.currentTestName?.replace(/\s+/g, '-').toLowerCase() || 'unnamed-test'

    // Combine file and test name to make the recording path unique
    const recordingName = `${testFile}/${testName}`

    // Create the Polly instance
    polly = new Polly(recordingName, {
        adapters: ['fetch'], // Intercept fetch calls
        persister: 'fs', // Store recordings in file system
        recordIfMissing: true, // Only record if there's no existing recording
        logLevel: 2, // Log Polly activity to console
        matchRequestsBy: {
            headers: {
                exclude: ['x-api-key'],
            },
        },
        persisterOptions: {
            fs: {
                recordingsDir: path.resolve(__dirname, '../../recordings'), // Directory for storing .har files
            },
        },
    })

    polly.server.any().on('beforePersist', (_req, recording) => {
        if (recording.request && recording.request.headers) {
            recording.request.headers = recording.request.headers.filter(
                (header: { name: string }) => header.name !== 'x-api-key',
            )
        }
    })
})

afterEach(async () => {
    // Stop and persist the Polly recording
    await polly.stop()
})
