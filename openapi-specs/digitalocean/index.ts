import { createClient as apifulCreateClient, OpenAPIBuilder } from 'apiful'

/**
 * Create a type-safe API client for DigitalOcean.
 *
 * @param config - Client configuration object
 * @param config.baseURL - The base URL of DigitalOcean API (default: https://api.digitalocean.com/v2)
 * @param config.headers - Optional default headers for all requests (typically API token)
 * @returns A configured client instance that can be extended with service builders
 *
 * @example
 * ```typescript
 * import { createClient, api } from 'toonfetch/digitalocean'
 *
 * const client = createClient({
 *   baseURL: 'https://api.digitalocean.com/v2',
 *   headers: {
 *     'Authorization': 'Bearer your-api-token'
 *   }
 * }).with(api)
 *
 * // Make type-safe API calls
 * const droplets = await client('/v2/droplets', {
 *   method: 'GET'
 * })
 * ```
 */
export { apifulCreateClient as createClient }

/**
 * DigitalOcean API builder.
 *
 * Provides type-safe access to the DigitalOcean API for managing droplets,
 * volumes, load balancers, Kubernetes clusters, and other cloud resources.
 * Use this with `createClient().with(api)` to get a fully typed client.
 *
 * @example
 * ```typescript
 * import { createClient, api } from 'toonfetch/digitalocean'
 *
 * const client = createClient({
 *   baseURL: 'https://api.digitalocean.com/v2',
 *   headers: {
 *     'Authorization': 'Bearer your-api-token'
 *   }
 * }).with(api)
 *
 * // List all droplets
 * const droplets = await client('/v2/droplets', {
 *   method: 'GET'
 * })
 *
 * // Create a new droplet
 * const newDroplet = await client('/v2/droplets', {
 *   method: 'POST',
 *   body: {
 *     name: 'my-droplet',
 *     region: 'nyc3',
 *     size: 's-1vcpu-1gb',
 *     image: 'ubuntu-22-04-x64'
 *   }
 * })
 *
 * // Get droplet by ID
 * const droplet = await client('/v2/droplets/{droplet_id}', {
 *   method: 'GET',
 *   path: { droplet_id: 12345 }
 * })
 * ```
 *
 * @see {@link https://docs.digitalocean.com/reference/api/ DigitalOcean API Documentation}
 */
export const api: ReturnType<typeof OpenAPIBuilder<'digitalOcean'>> = OpenAPIBuilder<'digitalOcean'>()

/**
 * Default export containing the DigitalOcean API builder.
 *
 * @example
 * ```typescript
 * import digitalocean from 'toonfetch/digitalocean'
 *
 * const client = createClient({ baseURL: '...' }).with(digitalocean.api)
 * ```
 */
const digitalOceanServices: {
  api: ReturnType<typeof OpenAPIBuilder<'digitalOcean'>>
} = {
  api,
}

export default digitalOceanServices
