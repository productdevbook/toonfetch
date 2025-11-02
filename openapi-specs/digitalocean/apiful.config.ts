import type { ApifulConfig } from 'apiful/config'
import { defineApifulConfig } from 'apiful/config'

const config: ApifulConfig = defineApifulConfig({
  services: {
    digitalOcean: {
      schema: './api.yaml',
    },
  },
})
export default config
