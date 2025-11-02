import type { ApifulConfig } from 'apiful/config'
import { defineApifulConfig } from 'apiful/config'

const config: ApifulConfig = defineApifulConfig({
  services: {
    oryKaratos: {
      schema: './kratos.json',
    },
    oryHydra: {
      schema: './hydra.json',
    },
  },
})
export default config
