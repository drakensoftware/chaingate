/** @returns {Promise<import('jest').Config>} */
export default async () => {
    return {
        preset: 'ts-jest',
        testEnvironment: 'node',
        roots: ['<rootDir>/src'],
        collectCoverage: true
    };
};
