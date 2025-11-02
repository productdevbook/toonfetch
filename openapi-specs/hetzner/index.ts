import { createClient as apifulCreateClient, OpenAPIBuilder } from 'apiful'

export type { HetznerCloud, HetznerCloudApiMethods, HetznerCloudApiPaths, HetznerCloudModel } from 'apiful/schema'

/**
 * Create a type-safe API client for Hetzner Cloud.
 *
 * @param config - Client configuration object
 * @param config.baseURL - The base URL of Hetzner Cloud API (default: https://api.hetzner.cloud/v1)
 * @param config.headers - Optional default headers for all requests (typically API token)
 * @returns A configured client instance that can be extended with service builders
 *
 * @example
 * ```typescript
 * import { createClient, cloud } from 'toonfetch/hetzner'
 *
 * const client = createClient({
 *   baseURL: 'https://api.hetzner.cloud/v1',
 *   headers: {
 *     'Authorization': 'Bearer your-api-token'
 *   }
 * }).with(cloud)
 *
 * // Make type-safe API calls
 * const servers = await client('/servers', {
 *   method: 'GET'
 * })
 * ```
 */
export { apifulCreateClient as createClient }

/**
 * Hetzner Cloud API builder.
 *
 * Provides type-safe access to the Hetzner Cloud API for managing servers,
 * volumes, networks, and other cloud resources.
 * Use this with `createClient().with(cloud)` to get a fully typed client.
 *
 * @example
 * ```typescript
 * import { createClient, cloud } from 'toonfetch/hetzner'
 *
 * const client = createClient({
 *   baseURL: 'https://api.hetzner.cloud/v1',
 *   headers: {
 *     'Authorization': 'Bearer your-api-token'
 *   }
 * }).with(cloud)
 *
 * // List all servers
 * const servers = await client('/servers', {
 *   method: 'GET'
 * })
 *
 * // Create a new server
 * const newServer = await client('/servers', {
 *   method: 'POST',
 *   body: {
 *     name: 'my-server',
 *     server_type: 'cx11',
 *     image: 'ubuntu-22.04',
 *     location: 'nbg1'
 *   }
 * })
 *
 * // Get server by ID
 * const server = await client('/servers/{id}', {
 *   method: 'GET',
 *   path: { id: '12345' }
 * })
 * ```
 *
 * @see {@link https://docs.hetzner.cloud/ Hetzner Cloud Documentation}
 */
export const cloud: ReturnType<typeof OpenAPIBuilder<'hetznerCloud'>> = OpenAPIBuilder<'hetznerCloud'>()

/**
 * Default export containing the Hetzner Cloud service builder.
 *
 * @example
 * ```typescript
 * import hetzner from 'toonfetch/hetzner'
 *
 * const client = createClient({ baseURL: '...' }).with(hetzner.cloud)
 * ```
 */
const hetznerServices: {
  cloud: ReturnType<typeof OpenAPIBuilder<'hetznerCloud'>>
} = {
  cloud,
}

export default hetznerServices
