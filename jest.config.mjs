// Configure dotenvx
import {config} from '@dotenvx/dotenvx'

config({path: '.env.test'})

export default {
    preset: 'ts-jest',
    testEnvironment: 'node',
    roots: ['<rootDir>/src'],
    collectCoverage: true
}
