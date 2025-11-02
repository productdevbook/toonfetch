import { createClient, hydra, kratos } from 'toonfetch/ory'

// Create Ory Kratos client
const kratosClient = createClient({
  baseURL: 'https://your-kratos-instance.com',
}).with(kratos)

// Create Ory Hydra client
const hydraClient = createClient({
  baseURL: 'https://your-hydra-instance.com',
}).with(hydra)

// Example: Get Kratos identity schema
async function getIdentitySchema() {
  try {
    const response = await kratosClient('/schemas/{id}', {
      method: 'GET',
      path: {
        id: 'default',
      },
    })

    console.log('Identity Schema:', response)
  }
  catch (error) {
    console.error('Error fetching identity schema:', error)
  }
}

// Example: List Hydra OAuth2 clients
async function listOAuth2Clients() {
  try {
    const response = await hydraClient('/admin/clients', {
      method: 'GET',
      query: {
        page_size: 10,
      },
    })

    console.log('OAuth2 Clients:', response)
  }
  catch (error) {
    console.error('Error listing OAuth2 clients:', error)
  }
}

// Example: Create Kratos identity
async function createIdentity() {
  try {
    const response = await kratosClient('/admin/identities', {
      method: 'POST',
      body: {
        schema_id: 'default',
        traits: {
          email: 'user@example.com',
          name: {
            first: 'John',
            last: 'Doe',
          },
        },
      },
    })

    console.log('Created Identity:', response)
  }
  catch (error) {
    console.error('Error creating identity:', error)
  }
}

// Run examples
async function main() {
  console.log('🚀 Ory Services Playground\n')

  // Uncomment to run examples:
  // await getIdentitySchema()
  // await listOAuth2Clients()
  // await createIdentity()

  console.log('\n✅ Playground ready!')
  console.log('💡 Edit this file to test the Ory services')
}

main().catch(console.error)
