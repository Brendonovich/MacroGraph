# API Tester - MacroGraph

A comprehensive API testing and workflow automation system built into MacroGraph. This feature provides Postman-like functionality with advanced features like request chaining, environment variables, and automatic logging.

## Features

### ✨ Core Capabilities

1. **Full HTTP Method Support**
   - GET, POST, PUT, PATCH, DELETE, HEAD, OPTIONS
   - Custom headers
   - Request body (JSON, text, etc.)

2. **Authentication Systems**
   - Bearer Token
   - Basic Auth (username/password)
   - API Key (custom header)
   - OAuth 2.0

3. **Environment Variables**
   - Store variables like API keys, tokens, base URLs
   - Use `{{variable}}` syntax in requests
   - Multiple environment support

4. **Request Chaining & Workflows**
   - Chain multiple API calls
   - Extract data from responses
   - Conditional execution based on response data
   - Variable interpolation between steps

5. **Automatic Logging**
   - All requests logged to PostgreSQL database
   - Markdown files generated daily in `api-logs/`
   - Timestamps, response times, and full request/response data

## Quick Start

### 1. Database Setup

The database schema has been added. Run migrations:

```bash
cd apps/web
pnpm db:push
```

### 2. Access the UI

Navigate to `/api-tester` in your MacroGraph web app (requires authentication).

### 3. Make Your First Request

1. Select HTTP method (GET, POST, etc.)
2. Enter URL: `https://api.github.com/users/github`
3. Click "Send"
4. View response and logs

## API Endpoints

### Execute API Call

**POST** `/api/api-tester/execute`

Execute a single API call with full configuration.

```typescript
// Request body
{
  "name": "Get User", // Optional
  "method": "GET",
  "url": "https://api.example.com/users/123",
  "headers": {
    "Content-Type": "application/json"
  },
  "auth": {
    "type": "bearer",
    "token": "your-token-here"
  },
  "requestBody": {
    "key": "value"
  },
  "timeout": 30000 // Optional, milliseconds
}

// Response
{
  "success": true,
  "response": {
    "status": 200,
    "statusText": "OK",
    "headers": { ... },
    "data": { ... },
    "responseTime": 123.45
  },
  "logId": 42,
  "logFile": "/path/to/api-logs/2025-11-24.md"
}
```

### Workflow Management

**GET** `/api/api-tester/workflow` - List all workflows

**POST** `/api/api-tester/workflow` - Create/update workflow

**DELETE** `/api/api-tester/workflow?id=123` - Delete workflow

#### Create Workflow Example

```typescript
{
  "name": "User Creation Flow",
  "description": "Create user and fetch details",
  "steps": [
    {
      "id": "step-1",
      "name": "Create User",
      "method": "POST",
      "url": "https://api.example.com/users",
      "authType": "bearer",
      "authConfig": {
        "token": "{{API_TOKEN}}"
      },
      "body": {
        "name": "John Doe",
        "email": "john@example.com"
      },
      "extractVariables": {
        "userId": "data.id"
      }
    },
    {
      "id": "step-2",
      "name": "Get User Details",
      "method": "GET",
      "url": "https://api.example.com/users/{{userId}}",
      "authType": "bearer",
      "authConfig": {
        "token": "{{API_TOKEN}}"
      }
    }
  ]
}
```

#### Execute Workflow

Add `"execute": true` to the POST body to execute immediately instead of saving:

```typescript
{
  "name": "Test Workflow",
  "steps": [...],
  "execute": true
}
```

### Environment Management

**GET** `/api/api-tester/environments` - List environments

**POST** `/api/api-tester/environments` - Create/update environment

**DELETE** `/api/api-tester/environments?id=123` - Delete environment

#### Create Environment Example

```typescript
{
  "name": "Production",
  "variables": {
    "API_TOKEN": "prod-token-here",
    "BASE_URL": "https://api.example.com",
    "USER_ID": "123"
  }
}
```

### View Logs

**GET** `/api/api-tester/logs` - List recent logs (default: 100)

**GET** `/api/api-tester/logs?id=123` - Get specific log

**GET** `/api/api-tester/logs?limit=50` - Limit results

## Usage Examples

### Example 1: Simple API Call

```typescript
const response = await fetch('/api/api-tester/execute', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    method: 'GET',
    url: 'https://jsonplaceholder.typicode.com/posts/1',
  })
});

const data = await response.json();
console.log(data.response.data);
```

### Example 2: Authenticated Request

```typescript
await fetch('/api/api-tester/execute', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    method: 'GET',
    url: 'https://api.github.com/user',
    auth: {
      type: 'bearer',
      token: 'ghp_yourTokenHere'
    }
  })
});
```

### Example 3: POST with JSON Body

```typescript
await fetch('/api/api-tester/execute', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    method: 'POST',
    url: 'https://jsonplaceholder.typicode.com/posts',
    headers: {
      'Content-Type': 'application/json'
    },
    requestBody: {
      title: 'New Post',
      body: 'This is the content',
      userId: 1
    }
  })
});
```

### Example 4: Workflow with Conditional Execution

```typescript
const workflow = {
  name: "User Validation Flow",
  steps: [
    {
      id: "check-user",
      name: "Check User Exists",
      method: "GET",
      url: "https://api.example.com/users/{{EMAIL}}",
      authType: "api_key",
      authConfig: {
        apiKey: "{{API_KEY}}",
        apiKeyHeader: "X-API-Key"
      },
      extractVariables: {
        userExists: "data.exists",
        userId: "data.id"
      }
    },
    {
      id: "create-user",
      name: "Create User If Not Exists",
      method: "POST",
      url: "https://api.example.com/users",
      authType: "api_key",
      authConfig: {
        apiKey: "{{API_KEY}}",
        apiKeyHeader: "X-API-Key"
      },
      body: {
        email: "{{EMAIL}}",
        name: "{{NAME}}"
      },
      condition: {
        field: "userExists",
        operator: "eq",
        value: false
      },
      skipOnConditionFail: true
    }
  ]
};

await fetch('/api/api-tester/workflow', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify(workflow)
});
```

## Variable Interpolation

Use `{{variableName}}` syntax anywhere in your requests:

- URLs: `https://api.example.com/users/{{userId}}`
- Headers: `Authorization: Bearer {{token}}`
- Body: `{ "userId": "{{userId}}" }`

Variables can come from:
1. Environment variables
2. Extracted from previous responses (in workflows)
3. Initial variables passed to workflow execution

## JSONPath Extraction

Extract values from responses using simple JSONPath:

- `data.user.id` → extracts `response.data.user.id`
- `items[0].name` → extracts first item's name
- `status` → extracts top-level status field

## Conditional Execution

Control workflow execution based on response data:

```typescript
{
  "condition": {
    "field": "data.status",      // JSONPath to field
    "operator": "eq",             // eq, neq, gt, lt, contains
    "value": "active"             // Expected value
  },
  "skipOnConditionFail": true     // Skip vs fail workflow
}
```

## Logging

### Database Logs

All API calls are logged to the `api_call_logs` table with:
- Full request details (method, URL, headers, body)
- Full response details (status, headers, body, timing)
- Error information if request failed
- Timestamp and user ID

### Markdown Logs

Daily markdown files are created in `api-logs/YYYY-MM-DD.md`:

```markdown
# API Call Log

**Timestamp:** 2025-11-24T10:30:45.123Z
**Name:** Get User Data

## Request

**Method:** GET
**URL:** https://api.example.com/users/123

**Headers:**
```json
{
  "Authorization": "Bearer ***",
  "Content-Type": "application/json"
}
```

## Response

**Status:** 200 OK
**Response Time:** 245.67ms

**Response Body:**
```json
{
  "id": 123,
  "name": "John Doe"
}
```

---
```

## Security Notes

1. **Sensitive Data**: Authentication tokens are not stored in full in the database, only metadata
2. **Markdown Files**: Consider adding `api-logs/` to `.gitignore`
3. **Environment Variables**: Store sensitive data in environments, not hardcoded
4. **User Isolation**: All data is scoped to the authenticated user

## Architecture

```
┌─────────────────────┐
│   UI Component      │
│   /api-tester       │
└──────────┬──────────┘
           │
           ▼
┌─────────────────────┐
│  API Endpoints      │
│  /api/api-tester/*  │
└──────────┬──────────┘
           │
           ▼
┌─────────────────────┐
│  Services           │
│  - api-client.ts    │ ← HTTP request execution
│  - api-logger.ts    │ ← Database & MD logging
│  - api-workflow.ts  │ ← Workflow execution
└──────────┬──────────┘
           │
           ▼
┌─────────────────────┐
│  Database           │
│  PostgreSQL         │
└─────────────────────┘
```

## Files Created

### Database Schema
- `apps/web/src/drizzle/schema.ts` - Added tables for logs, workflows, environments

### Services
- `apps/web/src/lib/api-client.ts` - HTTP client with auth support
- `apps/web/src/lib/api-logger.ts` - Logging service
- `apps/web/src/lib/api-workflow.ts` - Workflow execution engine

### API Endpoints
- `apps/web/src/app/api/api-tester/execute.ts` - Execute API calls
- `apps/web/src/app/api/api-tester/workflow.ts` - Workflow management
- `apps/web/src/app/api/api-tester/logs.ts` - View logs
- `apps/web/src/app/api/api-tester/environments.ts` - Environment management

### UI
- `apps/web/src/app/(app)/api-tester/index.tsx` - Main UI component

## Future Enhancements

- [ ] Import/export Postman collections
- [ ] GraphQL support
- [ ] WebSocket testing
- [ ] Request history with replay
- [ ] Collection organization
- [ ] Team sharing
- [ ] Mock server
- [ ] Load testing
- [ ] API documentation generator

## Support

For issues or questions, please open an issue on the MacroGraph GitHub repository.
