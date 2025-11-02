import type { ApifulConfig } from 'apiful/config'
import { defineApifulConfig } from 'apiful/config'

const config: ApifulConfig = defineApifulConfig({
  services: {
    hetznerCloud: {
      schema: './cloud.json',
    },
  },
})
export default config
