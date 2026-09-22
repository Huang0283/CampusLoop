import { defineConfig } from '@hey-api/openapi-ts'

export default defineConfig({
  input: '../openapi/campusloop.v1.yaml',
  output: 'src/sdk/generated',
  plugins: [
    '@hey-api/typescript',
    '@hey-api/client-fetch',
    {
      name: '@hey-api/sdk',
      responseStyle: 'data',
    },
  ],
})
