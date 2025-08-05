// jest.config.mjs
import { config as loadEnv } from '@dotenvx/dotenvx'

// Load .env file specific for tests
loadEnv({ path: '.env.test' })

/** @type {import('jest').Config} */
const jestConfig = {
    // Use ts-jest preset for compiling TypeScript to ESM
    preset: 'ts-jest/presets/default-esm',

    // Use Node.js environment
    testEnvironment: 'node',

    // Treat .ts files as ESM
    extensionsToTreatAsEsm: ['.ts'],

    // Transform TypeScript files using ts-jest in ESM mode
    transform: {
        '^.+\\.ts$': ['ts-jest', { useESM: true }],
    },

    // Look for test files in the src directory
    roots: ['<rootDir>/src'],

    // Files to run after setting up the test environment
    setupFilesAfterEnv: ['<rootDir>/src/TestUtils/setupPolly.auto.ts'],

    // Enable coverage collection
    collectCoverage: true,

    // Map relative imports ending in .js to avoid resolution issues
    moduleNameMapper: {
        // e.g. import x from './foo.js' --> ./foo
        '^(\\.{1,2}/.*)\\.js$': '$1',
    },
}

export default jestConfig
