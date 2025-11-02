import { createClient as apifulCreateClient, OpenAPIBuilder } from 'apiful'

export type {
  OryHydra,
  OryHydraApiMethods,
  OryHydraApiPaths,
  OryHydraModel,
  OryKaratos,
  OryKaratosApiMethods,
  OryKaratosApiPaths,
  OryKaratosModel,
} from 'apiful/schema'

/**
 * Create a type-safe API client for Ory services.
 *
 * @param config - Client configuration object
 * @param config.baseURL - The base URL of your Ory service instance
 * @param config.headers - Optional default headers for all requests
 * @returns A configured client instance that can be extended with service builders
 *
 * @example
 * ```typescript
 * import { createClient, kratos } from 'toonfetch/ory'
 *
 * const client = createClient({
 *   baseURL: 'https://your-kratos-instance.com',
 *   headers: {
 *     'X-Session-Token': 'your-session-token'
 *   }
 * }).with(kratos)
 *
 * // Make type-safe API calls
 * const schema = await client('/schemas/{id}', {
 *   method: 'GET',
 *   path: { id: 'default' }
 * })
 * ```
 */
export { apifulCreateClient as createClient }

/**
 * Ory Kratos API builder.
 *
 * Provides type-safe access to the Ory Kratos identity and user management API.
 * Use this with `createClient().with(kratos)` to get a fully typed client.
 *
 * @example
 * ```typescript
 * import { createClient, kratos } from 'toonfetch/ory'
 *
 * const client = createClient({
 *   baseURL: 'https://your-kratos-instance.com'
 * }).with(kratos)
 *
 * // List identities (admin endpoint)
 * const identities = await client('/admin/identities', {
 *   method: 'GET',
 *   query: {
 *     page_size: 10,
 *     page_token: '0'
 *   }
 * })
 *
 * // Create an identity
 * const newIdentity = await client('/admin/identities', {
 *   method: 'POST',
 *   body: {
 *     schema_id: 'default',
 *     traits: {
 *       email: 'user@example.com',
 *       name: 'John Doe'
 *     }
 *   }
 * })
 *
 * // Get identity schema
 * const schema = await client('/schemas/{id}', {
 *   method: 'GET',
 *   path: { id: 'default' }
 * })
 * ```
 *
 * @see {@link https://www.ory.sh/docs/kratos Ory Kratos Documentation}
 */
export const kratos: ReturnType<typeof OpenAPIBuilder<'oryKaratos'>> = OpenAPIBuilder<'oryKaratos'>()

/**
 * Ory Hydra API builder.
 *
 * Provides type-safe access to the Ory Hydra OAuth 2.0 and OpenID Connect server API.
 * Use this with `createClient().with(hydra)` to get a fully typed client.
 *
 * @example
 * ```typescript
 * import { createClient, hydra } from 'toonfetch/ory'
 *
 * const client = createClient({
 *   baseURL: 'https://your-hydra-instance.com'
 * }).with(hydra)
 *
 * // Get OAuth2 client
 * const oauthClient = await client('/admin/clients/{id}', {
 *   method: 'GET',
 *   path: { id: 'my-client-id' }
 * })
 *
 * // Create OAuth2 client
 * const newClient = await client('/admin/clients', {
 *   method: 'POST',
 *   body: {
 *     client_id: 'my-app',
 *     client_name: 'My Application',
 *     grant_types: ['authorization_code', 'refresh_token'],
 *     redirect_uris: ['https://myapp.com/callback'],
 *     response_types: ['code']
 *   }
 * })
 *
 * // Accept login request
 * const loginAccept = await client('/admin/oauth2/auth/requests/login/accept', {
 *   method: 'PUT',
 *   query: { login_challenge: 'challenge-string' },
 *   body: {
 *     subject: 'user-id',
 *     remember: true,
 *     remember_for: 3600
 *   }
 * })
 * ```
 *
 * @see {@link https://www.ory.sh/docs/hydra Ory Hydra Documentation}
 */
export const hydra: ReturnType<typeof OpenAPIBuilder<'oryHydra'>> = OpenAPIBuilder<'oryHydra'>()

/**
 * Default export containing all Ory service builders.
 *
 * @example
 * ```typescript
 * import ory from 'toonfetch/ory'
 *
 * const kratosClient = createClient({ baseURL: '...' }).with(ory.kratos)
 * const hydraClient = createClient({ baseURL: '...' }).with(ory.hydra)
 * ```
 */
const oryServices: {
  kratos: ReturnType<typeof OpenAPIBuilder<'oryKaratos'>>
  hydra: ReturnType<typeof OpenAPIBuilder<'oryHydra'>>
} = {
  kratos,
  hydra,
}

export default oryServices
