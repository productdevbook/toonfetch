import { createClient as apifulCreateClient, OpenAPIBuilder } from 'apiful'

// Re-export createClient for convenience
export { apifulCreateClient as createClient }

// Kratos builder adapter
export const kratos: ReturnType<typeof OpenAPIBuilder<'oryKaratos'>> = OpenAPIBuilder<'oryKaratos'>()

// Hydra builder adapter
export const hydra: ReturnType<typeof OpenAPIBuilder<'oryHydra'>> = OpenAPIBuilder<'oryHydra'>()

// Default export
const oryServices: {
  kratos: ReturnType<typeof OpenAPIBuilder<'oryKaratos'>>
  hydra: ReturnType<typeof OpenAPIBuilder<'oryHydra'>>
} = {
  kratos,
  hydra,
}

export default oryServices
