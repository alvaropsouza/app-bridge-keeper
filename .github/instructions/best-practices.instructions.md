---
applyTo: 'src/**'
---

# Good Practices guide

## 1. Use descriptive variable and function names

Choose names that clearly indicate the purpose of the variable or function. Avoid abbreviations and single-letter names, except for loop indices.

```typescript
// Bad
const x = 10;
function f(a: number, b: number) {
  return a + b;
}

// Good
const maxRetries = 10;
function calculateSum(num1: number, num2: number) {
  return num1 + num2;
}
```

## 2. The app bridge keeper only communicates with the provider (currently stytch)

The app bridge keeper should not have any direct communication with the users service. All identity and session interactions must go through the selected authentication provider adapter. This keeps a clear separation of concerns and improves maintainability/scalability.

## 3. Keep auth architecture pattern-oriented and clean

For auth-related code in `src/auth/**`, follow this structure:

- Strategy: keep provider contract in `AuthProvider`.
- Factory Method: keep provider selection/instantiation in `AuthProviderFactory`.
- Adapter: isolate SDK specifics in provider adapters (`supabase-auth.adapter.ts`, `stytch-auth.adapter.ts`).
- Use Cases: put operation-specific orchestration in `src/auth/use-cases/*`.
- Facade: keep `AuthService` thin, focused on coordination/logging/error boundaries.

Rules:

- Do not call provider SDKs directly from controllers.
- Do not leak SDK-specific types outside adapters.
- Add new providers by implementing `AuthProvider` + wiring factory/config only.
- Validate only env vars required by the selected provider.

## 4. Package manager

Use pnpm as the package manager for this project. Pnpm offers better performance and disk space efficiency compared to npm and yarn, making it a great choice for managing dependencies in modern JavaScript projects.
