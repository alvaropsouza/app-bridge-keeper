# App Bridge Keeper

Bridge keeper is a backend application built with NestJS that manages access control and authentication using Stytch for user session management.

## Features

- 🔐 Authentication via Stytch B2B Magic Links
- 👤 Session management and validation
- 🔄 Secure user logout
- 📊 Member information retrieval
- ✅ Comprehensive unit and e2e tests
- 🚀 Built with NestJS framework

## Prerequisites

- Node.js (v18 or higher)
- npm or yarn
- Stytch B2B account ([Sign up here](https://stytch.com))

## Installation

1. Clone the repository:
```bash
git clone https://github.com/alvaropsouza/app-bridge-keeper.git
cd app-bridge-keeper
```

2. Install dependencies:
```bash
npm install
```

3. Configure environment variables:
```bash
cp .env.example .env
```

Edit `.env` and add your Stytch credentials:
```env
STYTCH_PROJECT_ID=your-project-id-here
STYTCH_SECRET=your-secret-here
PORT=3000
NODE_ENV=development
```

## Getting Stytch Credentials

1. Go to [Stytch Dashboard](https://stytch.com/dashboard)
2. Create a new B2B project or select an existing one
3. Navigate to API Keys section
4. Copy your Project ID and Secret
5. Add them to your `.env` file

## Running the Application

### Development mode
```bash
npm run start:dev
```

### Production mode
```bash
npm run build
npm run start:prod
```

The application will start on `http://localhost:3000` (or the port specified in your `.env` file).

## API Endpoints

### Health Check
```
GET /
GET /health
```
Returns application status.

### Authentication

#### Initiate Login (Send Magic Link)
```
POST /auth/login
Content-Type: application/json

{
  "email": "user@example.com",
  "organizationId": "org-test-123"
}
```

#### Authenticate Magic Link
```
POST /auth/authenticate
Content-Type: application/json

{
  "token": "magic-link-token-from-email",
  "type": "magic_link"
}
```

#### Validate Session
```
GET /auth/validate
Authorization: Bearer <session-token>
```

#### Get Current User Info
```
GET /auth/me
Authorization: Bearer <session-token>
X-Organization-Id: org-test-123
```

#### Logout
```
POST /auth/logout
Authorization: Bearer <session-token>
```

## Testing

### Run all tests
```bash
npm test
```

### Run tests with coverage
```bash
npm run test:cov
```

### Run e2e tests
```bash
npm run test:e2e
```

### Run tests in watch mode
```bash
npm run test:watch
```

## Project Structure

```
app-bridge-keeper/
├── src/
│   ├── auth/                 # Authentication module
│   │   ├── auth.controller.ts
│   │   ├── auth.controller.spec.ts
│   │   ├── auth.service.ts
│   │   ├── auth.service.spec.ts
│   │   ├── auth.module.ts
│   │   ├── stytch.service.ts
│   │   └── stytch.service.spec.ts
│   ├── config/               # Configuration
│   │   └── stytch.config.ts
│   ├── app.controller.ts
│   ├── app.controller.spec.ts
│   ├── app.service.ts
│   ├── app.service.spec.ts
│   ├── app.module.ts
│   └── main.ts
├── test/                     # E2E tests
│   ├── app.e2e-spec.ts
│   ├── auth.e2e-spec.ts
│   └── jest-e2e.json
├── .env.example
├── .gitignore
├── nest-cli.json
├── package.json
├── tsconfig.json
└── README.md
```

## Development

### Linting
```bash
npm run lint
```

### Format code
```bash
npm run format
```

## Architecture

### Stytch Integration

The application uses Stytch B2B SDK for authentication and session management:

- **StytchService**: Wraps Stytch SDK client and provides methods for:
  - Sending magic links
  - Authenticating magic links
  - Session validation
  - Session revocation
  - Member information retrieval

- **AuthService**: Business logic layer that handles:
  - Login flow coordination
  - Session management
  - Error handling and logging

- **AuthController**: REST API endpoints for authentication operations

### Session Flow

1. User requests login with email and organization ID
2. Magic link is sent to user's email
3. User clicks magic link, receives token
4. Frontend authenticates token, receives session token
5. Session token is used for subsequent authenticated requests
6. User can logout to revoke the session

## Environment Variables

| Variable | Description | Required |
|----------|-------------|----------|
| `STYTCH_PROJECT_ID` | Your Stytch project ID | Yes |
| `STYTCH_SECRET` | Your Stytch secret key | Yes |
| `PORT` | Application port (default: 3000) | No |
| `NODE_ENV` | Environment (development/production) | No |
| `CORS_ORIGINS` | Comma-separated allowed CORS origins | No |

## Security Considerations

- Never commit `.env` file or expose Stytch credentials
- Always use HTTPS in production
- Validate session tokens on every protected endpoint
- Implement rate limiting for authentication endpoints
- Use environment-specific Stytch projects (dev/staging/prod)
- Configure CORS properly for production (specify allowed origins in `CORS_ORIGINS` environment variable)
- In production, either disable CORS or specify exact allowed origins

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add/update tests
5. Ensure all tests pass
6. Submit a pull request

## License

ISC

## Support

For issues and questions:
- Create an issue in the GitHub repository
- Check [Stytch Documentation](https://stytch.com/docs/b2b)
- Check [NestJS Documentation](https://docs.nestjs.com)
