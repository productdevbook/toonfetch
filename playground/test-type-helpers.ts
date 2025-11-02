// Test Type Helpers from toonfetch

import type { HetznerCloud } from 'toonfetch/hetzner'
import type { DigitalOcean } from 'toonfetch/digitalocean'
import type { OryKaratos, OryHydra } from 'toonfetch/ory'

// Hetzner Cloud: Get server response type
type GetServerResponse = HetznerCloud<'/servers/{id}', 'get'>['response']

// Hetzner Cloud: Create server request body (note: use 'request' not 'request.body')
type CreateServerBody = HetznerCloud<'/servers', 'post'>['request']

// Hetzner Cloud: Get servers query params
type ListServersQuery = HetznerCloud<'/servers', 'get'>['query']

// Hetzner Cloud: Path parameters
type ServerPathParams = HetznerCloud<'/servers/{id}', 'get'>['path']

// DigitalOcean: Get droplets response type
type GetDropletsResponse = DigitalOcean<'/v2/droplets', 'get'>['response']

// DigitalOcean: Create droplet request body
type CreateDropletBody = DigitalOcean<'/v2/droplets', 'post'>['request']

// Ory Kratos: Get identity response type
type GetIdentityResponse = OryKaratos<'/admin/identities/{id}', 'get'>['response']

// Ory Hydra: Get OAuth2 client response type
type GetOAuth2ClientResponse = OryHydra<'/admin/clients/{id}', 'get'>['response']

// Example usage in a function
function processServer(server: GetServerResponse) {
  if (server.server) {
    console.log('Server ID:', server.server.id)
    console.log('Server Name:', server.server.name)
    // TypeScript provides full autocomplete here!
  }
}

function createServerPayload(): CreateServerBody {
  return {
    name: 'my-server',
    server_type: 'cpx11',
    image: 'ubuntu-22.04',
    // TypeScript enforces the correct structure
  }
}

// Usage example with path params
function getServerById(params: ServerPathParams) {
  console.log('Fetching server:', params.id)
}

// Usage example with query params
function listServers(query: ListServersQuery) {
  console.log('Page:', query.page)
  console.log('Per page:', query.per_page)
}

console.log('✅ Type helpers are working!')
console.log('   - HetznerCloud type helper available')
console.log('   - DigitalOcean type helper available')
console.log('   - OryKaratos type helper available')
console.log('   - OryHydra type helper available')
