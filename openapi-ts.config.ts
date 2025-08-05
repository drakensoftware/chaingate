import { defineConfig } from '@hey-api/openapi-ts'

export default defineConfig({
    input: 'https://api.chaingate.dev/docs/swagger.json',
    output: 'src/Client',
    plugins: ['@hey-api/client-fetch'],
})
