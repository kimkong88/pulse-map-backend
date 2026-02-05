# Authentication Fixes

## Issues Found & Fixed

### 1. Missing `@Injectable()` Decorator
**File:** `src/auth/auth.service.ts`

**Problem:**
```typescript
export class AuthService {  // ❌ Missing @Injectable()
```

**Fix:**
```typescript
@Injectable()
export class AuthService {  // ✅ Added decorator
```

**Why it matters:** Without `@Injectable()`, NestJS can't inject dependencies, so `jwtService` was `undefined`.

---

### 2. JwtModule Not Exported
**File:** `src/tokens/tokens.module.ts`

**Problem:**
```typescript
exports: [TokensService],  // ❌ JwtModule not exported
```

**Fix:**
```typescript
exports: [TokensService, JwtModule],  // ✅ Export JwtModule
```

**Why it matters:** `AuthModule` imports `TokensModule`, but couldn't access `JwtService` because it wasn't exported.

---

### 3. Incorrect Provider Registration
**File:** `src/auth/auth.module.ts`

**Problem:**
```typescript
providers: [AuthService, AuthGuard, OptionalAuthGuard, JwtService],  // ❌ Can't manually add JwtService
```

**Fix:**
```typescript
providers: [AuthService, AuthGuard, OptionalAuthGuard],  // ✅ JwtService comes from imported JwtModule
```

**Why it matters:** `JwtService` needs to be configured through `JwtModule.register()`, not added as a plain provider.

---

### 4. JWT Timestamps in Milliseconds
**File:** `src/tokens/tokens.service.ts`

**Problem:**
```typescript
const payload = {
  sub: userId,
  iat: Date.now(),           // ❌ Milliseconds (1768584811026)
  exp: expires,              // ❌ Milliseconds
};
```

**Fix:**
```typescript
const payload = {
  sub: userId,
  iat: Math.floor(Date.now() / 1000),  // ✅ Seconds (1768584811)
  exp: Math.floor(expires / 1000),     // ✅ Seconds
};
```

**Why it matters:** JWT standard expects timestamps in **seconds**, not milliseconds. This was causing token validation to fail.

---

### 5. Added Exception Logging
**File:** `src/filters/http-exception.filter.ts` (new file)

**Problem:** Guards throw exceptions before interceptor runs, so errors weren't logged.

**Fix:** Created global exception filter to catch ALL exceptions including guard failures.

**Why it matters:** Now you can see ALL errors in logs, even authentication failures.

---

## Testing

After these fixes, restart your server and try `/me` endpoint again. You should:

1. **See proper logs:**
   ```
   → GET /me [Auth]
   ✅ GET /me - 200 - 150ms
   ```

2. **Get valid tokens** (with correct timestamps in seconds)

3. **Successfully authenticate** with the token

---

## Root Cause Summary

The 401 error was caused by **THREE cascading issues**:

1. Missing `@Injectable()` → `jwtService` was undefined
2. `JwtModule` not exported → Even if `@Injectable()` was there, it couldn't get `JwtService`
3. Manual provider registration → Wrong way to provide `JwtService`

Plus the bonus issue of millisecond timestamps breaking JWT validation.

