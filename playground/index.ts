import { createClient, hydra, kratos } from 'toonfetch/ory'

/**
 * Playground for testing ToonFetch with Ory services.
 *
 * Set these environment variables to use real endpoints:
 * - KRATOS_BASE_URL: Your Ory Kratos instance URL
 * - KRATOS_API_KEY: Your Kratos API key (if required)
 * - HYDRA_BASE_URL: Your Ory Hydra instance URL
 * - HYDRA_API_KEY: Your Hydra API key (if required)
 */

// Create Ory Kratos client with optional authentication
const kratosClient = createClient({
  baseURL: process.env.KRATOS_BASE_URL || 'https://your-kratos-instance.com',
  headers: process.env.KRATOS_API_KEY
    ? {
        'Authorization': `Bearer ${process.env.KRATOS_API_KEY}`,
      }
    : undefined,
}).with(kratos)

// Create Ory Hydra client with optional authentication
const hydraClient = createClient({
  baseURL: process.env.HYDRA_BASE_URL || 'https://your-hydra-instance.com',
  headers: process.env.HYDRA_API_KEY
    ? {
        'Authorization': `Bearer ${process.env.HYDRA_API_KEY}`,
      }
    : undefined,
}).with(hydra)

/**
 * Helper function to handle API errors with detailed logging.
 */
function handleApiError(error: unknown, context: string): void {
  if (error instanceof Error) {
    console.error(`❌ ${context} failed:`, error.message)

    // Log additional details if available
    if ('response' in error) {
      const response = (error as any).response
      console.error('   Status:', response?.status)
      console.error('   Data:', response?.data)
    }
  }
  else {
    console.error(`❌ ${context} failed:`, String(error))
  }
}

// ========================================
// Kratos Examples
// ========================================

/**
 * Example 1: Get Kratos identity schema.
 * Shows how to retrieve schema definitions for identity validation.
 */
async function getIdentitySchema() {
  console.log('\n📋 Fetching identity schema...')

  try {
    const response = await kratosClient('/schemas/{id}', {
      method: 'GET',
      path: {
        id: 'default',
      },
    })

    console.log('✅ Identity Schema retrieved successfully')
    console.log('   Schema ID:', response.$id || 'N/A')
    console.log('   Title:', response.title || 'N/A')

    return response
  }
  catch (error) {
    handleApiError(error, 'Get identity schema')
  }
}

/**
 * Example 2: List Kratos identities with pagination.
 * Shows how to retrieve a paginated list of identities.
 */
async function listIdentities() {
  console.log('\n👥 Listing identities...')

  try {
    const response = await kratosClient('/admin/identities', {
      method: 'GET',
      query: {
        page_size: 5,
        page_token: '0',
      },
    })

    console.log(`✅ Retrieved ${response.length || 0} identities`)

    return response
  }
  catch (error) {
    handleApiError(error, 'List identities')
  }
}

/**
 * Example 3: Create a new Kratos identity.
 * Demonstrates creating an identity with email and name traits.
 */
async function createIdentity() {
  console.log('\n➕ Creating identity...')

  try {
    const response = await kratosClient('/admin/identities', {
      method: 'POST',
      body: {
        schema_id: 'default',
        traits: {
          email: `user-${Date.now()}@example.com`,
          name: {
            first: 'John',
            last: 'Doe',
          },
        },
      },
    })

    console.log('✅ Identity created successfully')
    console.log('   ID:', response.id)
    console.log('   Email:', response.traits?.email)

    return response
  }
  catch (error) {
    handleApiError(error, 'Create identity')
  }
}

/**
 * Example 4: Delete an identity by ID.
 * Shows proper error handling for delete operations.
 */
async function deleteIdentity(identityId: string) {
  console.log(`\n🗑️  Deleting identity ${identityId}...`)

  try {
    await kratosClient('/admin/identities/{id}', {
      method: 'DELETE',
      path: {
        id: identityId,
      },
    })

    console.log('✅ Identity deleted successfully')
  }
  catch (error) {
    handleApiError(error, 'Delete identity')
  }
}

// ========================================
// Hydra Examples
// ========================================

/**
 * Example 5: List Hydra OAuth2 clients.
 * Shows pagination when listing OAuth2 clients.
 */
async function listOAuth2Clients() {
  console.log('\n🔐 Listing OAuth2 clients...')

  try {
    const response = await hydraClient('/admin/clients', {
      method: 'GET',
      query: {
        page_size: 10,
        page_token: '0',
      },
    })

    console.log(`✅ Retrieved ${response.length || 0} OAuth2 clients`)

    return response
  }
  catch (error) {
    handleApiError(error, 'List OAuth2 clients')
  }
}

/**
 * Example 6: Create a new OAuth2 client.
 * Demonstrates creating an OAuth2 client with authorization code flow.
 */
async function createOAuth2Client() {
  console.log('\n➕ Creating OAuth2 client...')

  try {
    const response = await hydraClient('/admin/clients', {
      method: 'POST',
      body: {
        client_id: `app-${Date.now()}`,
        client_name: 'My Application',
        grant_types: ['authorization_code', 'refresh_token'],
        redirect_uris: ['https://myapp.com/callback'],
        response_types: ['code'],
        scope: 'openid profile email',
        token_endpoint_auth_method: 'client_secret_basic',
      },
    })

    console.log('✅ OAuth2 client created successfully')
    console.log('   Client ID:', response.client_id)
    console.log('   Client Secret:', response.client_secret ? '***hidden***' : 'N/A')

    return response
  }
  catch (error) {
    handleApiError(error, 'Create OAuth2 client')
  }
}

/**
 * Example 7: Get OAuth2 client details.
 * Shows how to retrieve details of a specific OAuth2 client.
 */
async function getOAuth2Client(clientId: string) {
  console.log(`\n🔍 Getting OAuth2 client ${clientId}...`)

  try {
    const response = await hydraClient('/admin/clients/{id}', {
      method: 'GET',
      path: {
        id: clientId,
      },
    })

    console.log('✅ OAuth2 client retrieved successfully')
    console.log('   Name:', response.client_name)
    console.log('   Grant Types:', response.grant_types?.join(', '))

    return response
  }
  catch (error) {
    handleApiError(error, 'Get OAuth2 client')
  }
}

/**
 * Example 8: Delete an OAuth2 client.
 * Demonstrates proper cleanup of OAuth2 clients.
 */
async function deleteOAuth2Client(clientId: string) {
  console.log(`\n🗑️  Deleting OAuth2 client ${clientId}...`)

  try {
    await hydraClient('/admin/clients/{id}', {
      method: 'DELETE',
      path: {
        id: clientId,
      },
    })

    console.log('✅ OAuth2 client deleted successfully')
  }
  catch (error) {
    handleApiError(error, 'Delete OAuth2 client')
  }
}

// ========================================
// Demo Scenarios
// ========================================

/**
 * Scenario 1: Complete identity management workflow.
 * Creates an identity, retrieves it, and optionally deletes it.
 */
async function identityManagementWorkflow() {
  console.log('\n=== Identity Management Workflow ===')

  // Get schema first
  await getIdentitySchema()

  // Create new identity
  const newIdentity = await createIdentity()

  if (newIdentity?.id) {
    // List identities to see the new one
    await listIdentities()

    // Optionally delete the created identity
    // Uncomment to enable cleanup:
    // await deleteIdentity(newIdentity.id)
  }
}

/**
 * Scenario 2: OAuth2 client lifecycle.
 * Creates a client, retrieves it, and optionally deletes it.
 */
async function oauth2ClientLifecycle() {
  console.log('\n=== OAuth2 Client Lifecycle ===')

  // Create new OAuth2 client
  const newClient = await createOAuth2Client()

  if (newClient?.client_id) {
    // Retrieve the client details
    await getOAuth2Client(newClient.client_id)

    // List all clients
    await listOAuth2Clients()

    // Optionally delete the created client
    // Uncomment to enable cleanup:
    // await deleteOAuth2Client(newClient.client_id)
  }
}

// ========================================
// Main Entry Point
// ========================================

async function main() {
  console.log('🚀 ToonFetch Ory Services Playground\n')
  console.log('📝 This playground demonstrates type-safe API calls using toonfetch\n')

  // Check if real endpoints are configured
  const hasRealEndpoints = process.env.KRATOS_BASE_URL || process.env.HYDRA_BASE_URL
  if (!hasRealEndpoints) {
    console.log('⚠️  Using placeholder URLs. Set environment variables to test with real endpoints:')
    console.log('   - KRATOS_BASE_URL')
    console.log('   - KRATOS_API_KEY (if needed)')
    console.log('   - HYDRA_BASE_URL')
    console.log('   - HYDRA_API_KEY (if needed)\n')
  }

  // ===================================
  // Choose which examples to run:
  // ===================================

  // Option 1: Run individual examples
  // Uncomment any of these to test specific operations:

  // await getIdentitySchema()
  // await listIdentities()
  // await createIdentity()
  // await listOAuth2Clients()
  // await createOAuth2Client()

  // Option 2: Run complete workflows
  // Uncomment to run end-to-end scenarios:

  // await identityManagementWorkflow()
  // await oauth2ClientLifecycle()

  console.log('\n✅ Playground ready!')
  console.log('💡 Uncomment examples in main() to test different operations')
  console.log('📚 See function definitions above for usage examples\n')
}

// Run the playground
main().catch((error) => {
  console.error('\n💥 Unhandled error in playground:')
  console.error(error)
  process.exit(1)
})
