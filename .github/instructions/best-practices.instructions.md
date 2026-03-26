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

The app bridge keeper should not have any direct communication with the users service. All interactions with the users service should be done through the provider (stytch). This ensures a clear separation of concerns and allows for better maintainability and scalability of the codebase.
