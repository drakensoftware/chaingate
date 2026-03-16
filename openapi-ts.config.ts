import {defineConfig} from "@hey-api/openapi-ts";

export default defineConfig({
    input: 'https://api.chaingate.dev/openapi.json',
    output: 'src/Client',
    plugins: ['@hey-api/client-fetch'],
})
