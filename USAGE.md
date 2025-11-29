# API Usage Examples

This document provides examples of how to use the Bridge Keeper API with Stytch authentication.

## Prerequisites

Make sure you have:
1. Configured your `.env` file with valid Stytch credentials
2. Started the application: `npm run start:dev`

## Authentication Flow

### 1. Initiate Login (Send Magic Link)

Send a magic link to a user's email address.

```bash
curl -X POST http://localhost:3000/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "user@example.com",
    "organizationId": "organization-test-123abc"
  }'
```

**Response:**
```json
{
  "success": true,
  "message": "Magic link sent successfully",
  "requestId": "request-uuid-12345"
}
```

### 2. Authenticate Magic Link Token

After the user clicks the magic link in their email, use the token to get a session.

```bash
curl -X POST http://localhost:3000/auth/authenticate \
  -H "Content-Type: application/json" \
  -d '{
    "token": "DOYoip3rvIMMW5lgItikFK-Ak1CfMsgjuiCyI7uuU94=",
    "type": "magic_link"
  }'
```

**Response:**
```json
{
  "sessionToken": "session_token_here",
  "memberId": "member-uuid-123",
  "organizationId": "organization-test-123abc",
  "expiresAt": "2024-12-31T23:59:59.000Z"
}
```

### 3. Validate Session

Validate an existing session token.

```bash
curl -X GET http://localhost:3000/auth/validate \
  -H "Authorization: Bearer session_token_here"
```

**Response:**
```json
{
  "sessionToken": "session_token_here",
  "memberId": "member-uuid-123",
  "organizationId": "organization-test-123abc",
  "expiresAt": "2024-12-31T23:59:59.000Z"
}
```

### 4. Get Current User Info

Get information about the authenticated user.

```bash
curl -X GET http://localhost:3000/auth/me \
  -H "Authorization: Bearer session_token_here" \
  -H "X-Organization-Id: organization-test-123abc"
```

**Response:**
```json
{
  "memberId": "member-uuid-123",
  "email": "user@example.com",
  "status": "active",
  "name": "John Doe",
  "organizationId": "organization-test-123abc"
}
```

### 5. Logout

Revoke the current session.

```bash
curl -X POST http://localhost:3000/auth/logout \
  -H "Authorization: Bearer session_token_here"
```

**Response:**
```json
{
  "success": true,
  "message": "Session revoked successfully"
}
```

## Health Check Endpoints

### Application Status

```bash
curl http://localhost:3000/
```

**Response:**
```
Bridge Keeper API - Authentication Gateway with Stytch
```

### Health Check

```bash
curl http://localhost:3000/health
```

**Response:**
```json
{
  "status": "ok",
  "timestamp": "2024-11-29T17:55:00.000Z"
}
```

## Error Responses

### Unauthorized (401)

When authentication fails or token is invalid:

```json
{
  "statusCode": 401,
  "message": "Invalid or expired magic link",
  "error": "Unauthorized"
}
```

### Missing Authorization Header

```json
{
  "statusCode": 401,
  "message": "No authorization header provided",
  "error": "Unauthorized"
}
```

## Using in Your Application

### Frontend Example (JavaScript/TypeScript)

```typescript
// 1. Login - Send magic link
async function login(email: string, organizationId: string) {
  const response = await fetch('http://localhost:3000/auth/login', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ email, organizationId }),
  });
  return response.json();
}

// 2. Authenticate magic link (after user clicks link)
async function authenticateMagicLink(token: string) {
  const response = await fetch('http://localhost:3000/auth/authenticate', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ token, type: 'magic_link' }),
  });
  const data = await response.json();
  
  // Store session token for future requests
  localStorage.setItem('sessionToken', data.sessionToken);
  return data;
}

// 3. Make authenticated requests
async function getProfile() {
  const sessionToken = localStorage.getItem('sessionToken');
  
  const response = await fetch('http://localhost:3000/auth/me', {
    headers: {
      'Authorization': `Bearer ${sessionToken}`,
      'X-Organization-Id': 'your-org-id',
    },
  });
  return response.json();
}

// 4. Logout
async function logout() {
  const sessionToken = localStorage.getItem('sessionToken');
  
  const response = await fetch('http://localhost:3000/auth/logout', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${sessionToken}`,
    },
  });
  
  // Clear stored session
  localStorage.removeItem('sessionToken');
  return response.json();
}

// 5. Validate session on app load
async function validateSession() {
  const sessionToken = localStorage.getItem('sessionToken');
  if (!sessionToken) return false;
  
  try {
    const response = await fetch('http://localhost:3000/auth/validate', {
      headers: {
        'Authorization': `Bearer ${sessionToken}`,
      },
    });
    return response.ok;
  } catch {
    localStorage.removeItem('sessionToken');
    return false;
  }
}
```

## Testing Without Real Credentials

When running tests or development without Stytch credentials configured, the application will run in "mock mode" and log a warning. To test with real credentials:

1. Sign up at [Stytch Dashboard](https://stytch.com/dashboard)
2. Create a B2B project
3. Copy your Project ID and Secret
4. Update your `.env` file:

```env
STYTCH_PROJECT_ID=project-test-abc123
STYTCH_SECRET=secret-test-xyz789
PORT=3000
NODE_ENV=development
```

## Security Best Practices

1. **Always use HTTPS in production**
2. **Store session tokens securely** (httpOnly cookies recommended)
3. **Validate sessions on every protected route**
4. **Implement rate limiting** for authentication endpoints
5. **Use environment-specific Stytch projects** (dev/staging/prod)
6. **Never expose Stytch credentials** in client-side code
7. **Rotate secrets regularly**

## Troubleshooting

### "Stytch client not initialized" error

This means your `.env` file is missing or has invalid credentials. Check:
- `.env` file exists in the root directory
- `STYTCH_PROJECT_ID` and `STYTCH_SECRET` are set correctly
- Credentials are valid in Stytch Dashboard

### "Invalid or expired magic link" error

- Magic links expire after a certain time (default: 5 minutes)
- Each magic link can only be used once
- Ensure the token is being sent correctly

### Session validation fails

- Session tokens expire (check `expiresAt` field)
- Session may have been revoked
- Token may be malformed or incomplete
