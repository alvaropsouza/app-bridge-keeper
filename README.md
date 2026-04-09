# App Bridge Keeper

App Bridge Keeper is a NestJS authentication gateway that supports multiple auth providers behind a single contract.

## Highlights

- Provider-agnostic authentication via Strategy pattern
- Runtime provider selection (`AUTH_PROVIDER=supabase|stytch`)
- Dedicated factory for provider instantiation
- Infrastructure adapters for external SDKs (Supabase and Stytch)
- Application use cases for clean orchestration
- Cookie + bearer-based session validation flow

## Tech Stack

- NestJS 11
- TypeScript
- Supabase Auth SDK
- Stytch SDK
- pnpm

## Architecture

The auth module follows a clean layering and pattern-oriented design:

1. Strategy
   `AuthProvider` is the contract implemented by each provider adapter.
2. Factory Method
   `AuthProviderFactory` builds the concrete strategy based on `AUTH_PROVIDER`.
3. Adapter
   `SupabaseAuthAdapter` and `StytchAuthAdapter` isolate SDK-specific details.
4. Application Use Cases
   Login/session/register operations are represented by dedicated use-case classes.
5. Facade Service
   `AuthService` coordinates use cases and centralizes logging/error boundaries.

### Auth Module Structure

```
src/auth/
  auth.controller.ts
  auth.service.ts
  auth.module.ts
  auth-provider.interface.ts
  auth-provider-config.service.ts
  auth-provider.factory.ts
  supabase-auth.adapter.ts
  stytch-auth.adapter.ts
  use-cases/
    register-user.use-case.ts
    ensure-user.use-case.ts
    initiate-login.use-case.ts
    authenticate-magic-link.use-case.ts
    validate-session.use-case.ts
    logout.use-case.ts
```

## Installation

1. Clone the repository:

```bash
git clone https://github.com/alvaropsouza/app-bridge-keeper.git
cd app-bridge-keeper
```

2. Install dependencies:

```bash
pnpm install
```

3. Create your local env file:

```bash
cp .env.example .env
```

## Environment Variables

### Core

| Variable                 | Description                               | Required                   |
| ------------------------ | ----------------------------------------- | -------------------------- |
| `AUTH_PROVIDER`          | Selected provider: `supabase` or `stytch` | No (default: `supabase`)   |
| `FRONTEND_URL`           | Redirect URL used by magic link flows     | Yes                        |
| `PORT`                   | API port                                  | No (default: `3000`)       |
| `NODE_ENV`               | Runtime environment                       | No                         |
| `CORS_ORIGINS`           | Comma-separated allowed origins           | No                         |
| `INTERNAL_SERVICE_TOKEN` | Token for internal protected endpoints    | Yes for internal endpoints |

### Supabase Provider

Required only when `AUTH_PROVIDER=supabase`.

| Variable                   | Description                            | Required               |
| -------------------------- | -------------------------------------- | ---------------------- |
| `SUPABASE_URL`             | Supabase project URL                   | Yes                    |
| `SUPABASE_PUBLISHABLE_KEY` | Supabase publishable key               | Yes                    |
| `SUPABASE_SECRET_KEY`      | Supabase secret key (admin operations) | Conditionally required |

Notes:

- `SUPABASE_SECRET_KEY` is required for `register`, `ensure-user`, and token revocation.
- Login and session validation can operate with publishable key only.

### Stytch Provider

Required only when `AUTH_PROVIDER=stytch`.

| Variable            | Description       | Required |
| ------------------- | ----------------- | -------- |
| `STYTCH_PROJECT_ID` | Stytch project ID | Yes      |
| `STYTCH_SECRET`     | Stytch secret key | Yes      |

## Run

### Development

```bash
pnpm run start:dev
```

### Production

```bash
pnpm run build
pnpm run start:prod
```

## API Endpoints

### Health

```
GET /
GET /health
```

### Auth

```
POST /auth/register
POST /auth/ensure-user
POST /auth/login
POST /auth/authenticate
GET  /auth/callback
GET  /auth/me
GET  /auth/validate
POST /auth/logout
```

## Session Flow

1. Client requests `POST /auth/login` with email.
2. Provider sends magic link.
3. Callback/authenticate endpoint exchanges token for session.
4. Session token is set in `kab_session` cookie and returned in payload.
5. Subsequent requests validate via cookie or bearer token fallback.

## Development Commands

```bash
pnpm run build
pnpm run lint
pnpm run test
pnpm run test:e2e
pnpm run format
```

## Security Notes

- Never commit `.env` with real credentials.
- Use HTTPS in production.
- Restrict CORS to trusted origins in production.
- Rotate provider secrets periodically.
- Keep `INTERNAL_SERVICE_TOKEN` private and environment-specific.
