/**
 * API Tester - Example Usage
 *
 * This file contains practical examples of using the API Tester functionality
 */

// ============================================================================
// Example 1: Simple GET Request
// ============================================================================

async function example1_simpleGet() {
  const response = await fetch('/api/api-tester/execute', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      name: 'Get GitHub User',
      method: 'GET',
      url: 'https://api.github.com/users/github',
    })
  });

  const result = await response.json();
  console.log('User data:', result.response.data);
  console.log('Response time:', result.response.responseTime, 'ms');
  console.log('Logged to:', result.logFile);
}

// ============================================================================
// Example 2: POST Request with Bearer Auth
// ============================================================================

async function example2_postWithAuth() {
  const response = await fetch('/api/api-tester/execute', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      name: 'Create Todo',
      method: 'POST',
      url: 'https://jsonplaceholder.typicode.com/posts',
      headers: {
        'Content-Type': 'application/json'
      },
      auth: {
        type: 'bearer',
        token: 'your-api-token-here'
      },
      requestBody: {
        title: 'New Task',
        body: 'Task description',
        userId: 1
      }
    })
  });

  const result = await response.json();
  console.log('Created post:', result.response.data);
}

// ============================================================================
// Example 3: API Key Authentication
// ============================================================================

async function example3_apiKeyAuth() {
  const response = await fetch('/api/api-tester/execute', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      name: 'Weather API Call',
      method: 'GET',
      url: 'https://api.openweathermap.org/data/2.5/weather?q=London',
      auth: {
        type: 'api_key',
        apiKey: 'your-api-key',
        apiKeyHeader: 'X-API-Key'
      }
    })
  });

  const result = await response.json();
  console.log('Weather data:', result.response.data);
}

// ============================================================================
// Example 4: Basic Authentication
// ============================================================================

async function example4_basicAuth() {
  const response = await fetch('/api/api-tester/execute', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      name: 'Protected Resource',
      method: 'GET',
      url: 'https://httpbin.org/basic-auth/user/pass',
      auth: {
        type: 'basic',
        username: 'user',
        password: 'pass'
      }
    })
  });

  const result = await response.json();
  console.log('Protected data:', result.response.data);
}

// ============================================================================
// Example 5: Create Environment
// ============================================================================

async function example5_createEnvironment() {
  const response = await fetch('/api/api-tester/environments', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      name: 'Development',
      variables: {
        BASE_URL: 'https://dev.api.example.com',
        API_TOKEN: 'dev-token-123',
        USER_ID: '42',
        API_VERSION: 'v1'
      }
    })
  });

  const result = await response.json();
  console.log('Environment created:', result.environmentId);
  return result.environmentId;
}

// ============================================================================
// Example 6: Use Environment Variables
// ============================================================================

async function example6_useEnvironmentVariables() {
  // First create an environment
  const envId = await example5_createEnvironment();

  // Now use those variables in a request
  const response = await fetch('/api/api-tester/execute', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      name: 'Get User with Variables',
      method: 'GET',
      url: '{{BASE_URL}}/users/{{USER_ID}}',
      auth: {
        type: 'bearer',
        token: '{{API_TOKEN}}'
      },
      // Pass environment variables
      variables: {
        BASE_URL: 'https://api.example.com',
        API_TOKEN: 'prod-token',
        USER_ID: '123'
      }
    })
  });

  const result = await response.json();
  console.log('User data:', result.response.data);
}

// ============================================================================
// Example 7: Simple Workflow - Create and Fetch
// ============================================================================

async function example7_simpleWorkflow() {
  const workflow = {
    name: 'Create Post and Fetch It',
    description: 'Creates a new post and then fetches it',
    steps: [
      {
        id: 'create-post',
        name: 'Create New Post',
        method: 'POST',
        url: 'https://jsonplaceholder.typicode.com/posts',
        authType: 'none',
        body: {
          title: 'My New Post',
          body: 'This is the post content',
          userId: 1
        },
        extractVariables: {
          postId: 'id'  // Extract post ID from response
        }
      },
      {
        id: 'fetch-post',
        name: 'Fetch Created Post',
        method: 'GET',
        url: 'https://jsonplaceholder.typicode.com/posts/{{postId}}',
        authType: 'none'
      }
    ],
    execute: true  // Execute immediately
  };

  const response = await fetch('/api/api-tester/workflow', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(workflow)
  });

  const result = await response.json();
  console.log('Workflow execution:', result.execution);
  console.log('Step results:', result.execution.steps);
  console.log('Extracted variables:', result.execution.extractedVariables);
}

// ============================================================================
// Example 8: Conditional Workflow
// ============================================================================

async function example8_conditionalWorkflow() {
  const workflow = {
    name: 'User Check and Create',
    description: 'Check if user exists, create if not',
    steps: [
      {
        id: 'check-user',
        name: 'Check User Exists',
        method: 'GET',
        url: 'https://jsonplaceholder.typicode.com/users/999',
        authType: 'none',
        extractVariables: {
          userId: 'id',
          userName: 'name'
        }
      },
      {
        id: 'create-user',
        name: 'Create User If Not Found',
        method: 'POST',
        url: 'https://jsonplaceholder.typicode.com/users',
        authType: 'none',
        body: {
          name: 'New User',
          email: 'newuser@example.com'
        },
        // Only execute if previous request failed (404)
        condition: {
          field: 'id',
          operator: 'eq',
          value: null
        },
        skipOnConditionFail: true
      }
    ],
    execute: true
  };

  const response = await fetch('/api/api-tester/workflow', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(workflow)
  });

  const result = await response.json();
  console.log('Workflow result:', result.execution);
}

// ============================================================================
// Example 9: Multi-Step API Integration
// ============================================================================

async function example9_multiStepIntegration() {
  const workflow = {
    name: 'Complete User Onboarding',
    description: 'Create user, assign role, send welcome email',
    steps: [
      {
        id: 'create-user',
        name: 'Create User Account',
        method: 'POST',
        url: '{{BASE_URL}}/api/users',
        authType: 'bearer',
        authConfig: {
          token: '{{ADMIN_TOKEN}}'
        },
        body: {
          email: '{{USER_EMAIL}}',
          name: '{{USER_NAME}}',
          password: '{{USER_PASSWORD}}'
        },
        extractVariables: {
          userId: 'data.id',
          userToken: 'data.token'
        }
      },
      {
        id: 'assign-role',
        name: 'Assign User Role',
        method: 'POST',
        url: '{{BASE_URL}}/api/users/{{userId}}/roles',
        authType: 'bearer',
        authConfig: {
          token: '{{ADMIN_TOKEN}}'
        },
        body: {
          role: 'member'
        }
      },
      {
        id: 'send-welcome-email',
        name: 'Send Welcome Email',
        method: 'POST',
        url: '{{BASE_URL}}/api/emails/send',
        authType: 'bearer',
        authConfig: {
          token: '{{ADMIN_TOKEN}}'
        },
        body: {
          to: '{{USER_EMAIL}}',
          template: 'welcome',
          data: {
            name: '{{USER_NAME}}',
            userId: '{{userId}}'
          }
        }
      }
    ]
  };

  // Save workflow for later use
  const response = await fetch('/api/api-tester/workflow', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(workflow)
  });

  const result = await response.json();
  console.log('Workflow saved with ID:', result.workflowId);
}

// ============================================================================
// Example 10: View Recent Logs
// ============================================================================

async function example10_viewLogs() {
  const response = await fetch('/api/api-tester/logs?limit=10');
  const result = await response.json();

  console.log('Recent API calls:');
  result.logs.forEach((log: any) => {
    console.log(`
      ${log.name || 'Unnamed'}
      ${log.method} ${log.url}
      Status: ${log.responseStatus || 'N/A'}
      Time: ${log.responseTime || 'N/A'}ms
      Timestamp: ${new Date(log.timestamp).toLocaleString()}
    `);
  });
}

// ============================================================================
// Example 11: Get Specific Log Details
// ============================================================================

async function example11_getLogDetails(logId: number) {
  const response = await fetch(`/api/api-tester/logs?id=${logId}`);
  const result = await response.json();

  const log = result.log;
  console.log('Log Details:');
  console.log('Request:', {
    method: log.method,
    url: log.url,
    headers: log.headers,
    body: log.requestBody
  });
  console.log('Response:', {
    status: log.responseStatus,
    headers: log.responseHeaders,
    body: log.responseBody,
    time: log.responseTime + 'ms'
  });
}

// ============================================================================
// Example 12: List All Environments
// ============================================================================

async function example12_listEnvironments() {
  const response = await fetch('/api/api-tester/environments');
  const result = await response.json();

  console.log('Environments:');
  result.environments.forEach((env: any) => {
    console.log(`
      ${env.name} (ID: ${env.id})
      Variables: ${Object.keys(env.variables).join(', ')}
      Created: ${new Date(env.createdAt).toLocaleDateString()}
    `);
  });
}

// ============================================================================
// Example 13: List All Workflows
// ============================================================================

async function example13_listWorkflows() {
  const response = await fetch('/api/api-tester/workflow');
  const result = await response.json();

  console.log('Workflows:');
  result.workflows.forEach((workflow: any) => {
    console.log(`
      ${workflow.name} (ID: ${workflow.id})
      ${workflow.description || 'No description'}
      Steps: ${workflow.steps.length}
      Created: ${new Date(workflow.createdAt).toLocaleDateString()}
    `);
  });
}

// ============================================================================
// Example 14: Complex Nested Data Extraction
// ============================================================================

async function example14_nestedExtraction() {
  const workflow = {
    name: 'Extract Nested Data',
    description: 'Demonstrate JSONPath extraction',
    steps: [
      {
        id: 'get-data',
        name: 'Fetch Complex Data',
        method: 'GET',
        url: 'https://jsonplaceholder.typicode.com/users/1',
        authType: 'none',
        extractVariables: {
          userId: 'id',
          userName: 'name',
          userEmail: 'email',
          userCity: 'address.city',
          userLat: 'address.geo.lat',
          companyName: 'company.name'
        }
      },
      {
        id: 'use-extracted',
        name: 'Use Extracted Variables',
        method: 'POST',
        url: 'https://jsonplaceholder.typicode.com/posts',
        authType: 'none',
        body: {
          title: 'Post by {{userName}} from {{userCity}}',
          body: 'Company: {{companyName}}',
          userId: '{{userId}}'
        }
      }
    ],
    execute: true
  };

  const response = await fetch('/api/api-tester/workflow', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(workflow)
  });

  const result = await response.json();
  console.log('Extracted variables:', result.execution.extractedVariables);
}

// ============================================================================
// Example 15: Error Handling in Workflows
// ============================================================================

async function example15_errorHandling() {
  const workflow = {
    name: 'Error Handling Demo',
    description: 'Handle API errors gracefully',
    steps: [
      {
        id: 'valid-request',
        name: 'Valid API Call',
        method: 'GET',
        url: 'https://jsonplaceholder.typicode.com/posts/1',
        authType: 'none',
        extractVariables: {
          postId: 'id'
        }
      },
      {
        id: 'check-status',
        name: 'Check Post Exists',
        method: 'GET',
        url: 'https://jsonplaceholder.typicode.com/posts/999999',
        authType: 'none',
        // This might fail, so we can handle it
      }
    ],
    execute: true
  };

  const response = await fetch('/api/api-tester/workflow', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(workflow)
  });

  const result = await response.json();

  console.log('Workflow success:', result.execution.success);
  result.execution.steps.forEach((step: any) => {
    console.log(`Step ${step.name}:`, step.success ? 'Success' : `Failed: ${step.error}`);
  });
}

// ============================================================================
// Export all examples
// ============================================================================

export const examples = {
  example1_simpleGet,
  example2_postWithAuth,
  example3_apiKeyAuth,
  example4_basicAuth,
  example5_createEnvironment,
  example6_useEnvironmentVariables,
  example7_simpleWorkflow,
  example8_conditionalWorkflow,
  example9_multiStepIntegration,
  example10_viewLogs,
  example11_getLogDetails,
  example12_listEnvironments,
  example13_listWorkflows,
  example14_nestedExtraction,
  example15_errorHandling,
};

// Run all examples (uncomment to use)
// async function runAllExamples() {
//   await example1_simpleGet();
//   await example2_postWithAuth();
//   // ... run other examples
// }
