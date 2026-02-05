# Authentication Flow

## Overview

The authentication system supports **ghost users** (users without accounts) and **account holders**. This allows users to try the app before committing to sign up.

## User Journey

### 1. **Ghost User Flow** (No Account)

```
User → POST /users
       {
         "fullName": "John Doe",
         "birthDate": "1990-01-01T12:00:00",
         "gender": "male",
         ...
       }
     ↓
Creates ghost user (accountId = null)
Returns user + tokens
     ↓
User can now access:
- GET /me (basic profile)
- Limited features
     ↓
⚠️ Cannot access:
- POST /me/report (requires account)
- Premium features
```

### 2. **Unified Authenticate Flow** (Sign Up OR Sign In)

**Single endpoint handles both cases based on auth state:**

```
POST /auth/authenticate
{
  "token": "google_oauth_token",
  "provider": "google"
}

→ OptionalAuthGuard checks if request has valid user token

CASE A: Authenticated (Ghost User) → SIGN UP FLOW
  1. Decode OAuth token (get email)
  2. Check if account exists
     - YES: → 409 Conflict (ACCOUNT_ALREADY_EXISTS)
     - NO: Continue
  3. Create account with email + platform
  4. Link current user to account
  5. Mark user as primary
  6. Return account + user + tokens
  → User now has full access

CASE B: Not Authenticated → SIGN IN FLOW
  1. Decode OAuth token (get email)
  2. Find account by platform + email
     - Not found: → 404 (ACCOUNT_NOT_FOUND)
     - Found: Continue
  3. Get all users linked to account
  4. Get primary user (or first user)
  5. Generate tokens for primary user
  6. Return account + users + tokens
  → User is authenticated
```

## API Endpoints

### `POST /users` (Create Ghost User)

**No authentication required**

**Request:**
```json
{
  "fullName": "John Doe",
  "birthDate": "1990-01-01T12:00:00",
  "gender": "male",
  "birthLocation": "Seoul, South Korea",
  "birthTimezone": "Asia/Seoul",
  "currentLocation": "Vancouver, Canada",
  "currentTimezone": "America/Vancouver",
  "isTimeKnown": true
}
```

**Response:**
```json
{
  "user": {
    "id": "user-123",
    "fullName": "John Doe",
    "accountId": null,
    "isPrimary": true,
    ...
  },
  "tokens": {
    "access": { "token": "...", "expires": "..." },
    "refresh": { "token": "...", "expires": "..." }
  }
}
```

---

### `POST /auth/authenticate` (Unified Sign Up / Sign In)

**Uses OptionalAuthGuard** - works with or without authentication

**Request:**
```json
{
  "token": "google_oauth_id_token",
  "provider": "google"
}
```

**Response (Success - 200 or 201):**

**Case A: Authenticated (Ghost User → Sign Up)**
```json
{
  "account": {
    "id": "account-123",
    "email": "john@example.com",
    "platform": "google"
  },
  "user": {
    "id": "user-123",
    "fullName": "John Doe",
    "accountId": "account-123",
    "isPrimary": true,
    ...
  },
  "tokens": {
    "access": { "token": "...", "expires": "..." },
    "refresh": { "token": "...", "expires": "..." }
  },
  "action": "sign_up"
}
```

**Case B: Not Authenticated (Existing Account → Sign In)**
```json
{
  "account": {
    "id": "account-123",
    "email": "john@example.com",
    "platform": "google"
  },
  "user": {
    "id": "user-123",
    "fullName": "John Doe",
    "accountId": "account-123",
    "isPrimary": true,
    ...
  },
  "users": [
    { "id": "user-123", ... },
    { "id": "user-456", ... }
  ],
  "tokens": {
    "access": { "token": "...", "expires": "..." },
    "refresh": { "token": "...", "expires": "..." }
  },
  "action": "sign_in"
}
```

**Error Responses (Sign Up - Authenticated):**

**409 Conflict** - Account already exists:
```json
{
  "code": "ACCOUNT_ALREADY_EXISTS",
  "message": "An account with this email already exists",
  "action": "sign_in"
}
```

**409 Conflict** - User already linked:
```json
{
  "code": "USER_ALREADY_LINKED",
  "message": "This user is already linked to an account"
}
```

**Error Responses (Sign In - Not Authenticated):**

**404 Not Found** - Account doesn't exist:
```json
{
  "code": "ACCOUNT_NOT_FOUND",
  "message": "No account found with this email",
  "action": "sign_up",
  "suggestion": "Please create a ghost user first, then authenticate"
}
```

**404 Not Found** - No users linked:
```json
{
  "code": "NO_USERS_FOUND",
  "message": "Account exists but no users linked",
  "action": "create_user"
}
```

---

### `POST /auth/refresh` (Refresh Tokens)

**No authentication required** (uses refresh token)

**Request:**
```json
{
  "refreshToken": "refresh_token_here"
}
```

**Response:**
```json
{
  "tokens": {
    "access": { "token": "...", "expires": "..." },
    "refresh": { "token": "...", "expires": "..." }
  }
}
```

## Key Features

### 1. **Ghost Users Can Only Have 1 User at a Time**

- Non-account holders are limited to a single user/profile
- When they sign up, their existing user is linked to the new account
- This prevents complexity while allowing trial usage

### 2. **Account Uniqueness**

- Accounts are unique by `platform + email` combination
- Same email can exist across different platforms (Google vs Apple)
- Prevents duplicate sign-ups

### 3. **Primary User Management**

- When a ghost user signs up, they become the primary user
- Primary user is used for sign-in (when multiple users exist)
- Can be changed later when creating additional profiles

### 4. **OAuth Token Verification**

- Decodes OAuth ID tokens from Google/Apple
- Verifies the `iss` (issuer) claim matches the provider
- Extracts email for account lookup/creation

**Valid Issuers:**
- Google: `https://accounts.google.com`
- Apple: `https://appleid.apple.com`

### 5. **Account-Gated Features**

Some features require an account:
- `POST /me/report` - Generate and save personal reports
- Premium subscriptions
- Creating multiple profiles

Check is done via:
```typescript
if (!user.accountId) {
  throw new ForbiddenException({
    code: 'ACCOUNT_SETUP_REQUIRED',
    message: 'Please create an account to access this feature',
    action: 'create_account',
  });
}
```

## Implementation Details

### Database Schema

**Account Model:**
```prisma
model Account {
  id            String         @id @default(uuid())
  platform      Platform
  email         String
  userIds       String[]
  users         User[]
  reports       Report[]
  subscriptions Subscription[]
  createdAt     DateTime       @default(now())
  updatedAt     DateTime       @updatedAt

  @@unique([platform, email])
}

enum Platform {
  google
  apple
}
```

**User Model (relevant fields):**
```prisma
model User {
  id        String   @id @default(uuid())
  accountId String?  // null for ghost users
  account   Account? @relation(fields: [accountId], references: [id])
  isPrimary Boolean  @default(false)
  ...
}
```

### Repository Methods

**accounts.repository.ts:**
- `createAccount(data)` - Create new account
- `findAccountByUserId(userId)` - Find account by linked user
- `findAccountByPlatformAndEmail(platform, email)` - Find account by unique constraint
- `connectAccount(userId, accountId)` - Link user to account

**users.repository.ts:**
- `createUser(data)` - Create new user
- `findById(userId)` - Find user by ID
- `findUsersByAccountId(accountId)` - Get all users for an account
- `updateUser(userId, data)` - Update user fields

## Security Considerations

1. **OAuth Token Validation**
   - Tokens should be verified against OAuth provider's public keys
   - Currently using basic JWT decode + issuer verification
   - TODO: Add full signature verification

2. **Token Expiration**
   - Access tokens expire after 1 hour
   - Refresh tokens expire after 30 days
   - Use `/auth/refresh` to get new tokens

3. **AuthGuard**
   - Validates JWT tokens on protected routes
   - Extracts user context (userId, accountId if exists)
   - Throws 401 Unauthorized if invalid

## Error Handling

All auth errors follow this structure:

```json
{
  "code": "ERROR_CODE",
  "message": "Human-readable error message",
  "action": "suggested_action",  // optional
  "suggestion": "Help text"       // optional
}
```

**Common Error Codes:**
- `ACCOUNT_ALREADY_EXISTS` - Sign up with existing account
- `ACCOUNT_NOT_FOUND` - Sign in without account
- `USER_ALREADY_LINKED` - Ghost user already has account
- `NO_USERS_FOUND` - Account exists but no users
- `ACCOUNT_SETUP_REQUIRED` - Feature requires account
- `invalid_token` - Invalid OAuth token
- `invalid_authentication_provider` - Issuer mismatch
- `invalid_or_expired_token` - JWT validation failed

## Testing Flow

### Test 1: Ghost User Creation
```bash
POST /users
→ 201, returns user + tokens (accountId = null)
```

### Test 2: Ghost User Sign Up
```bash
# 1. Create ghost user
POST /users → Returns user-123 with token

# 2. Authenticate with OAuth (WITH ghost user token in header)
POST /auth/authenticate
Headers: { Authorization: "Bearer <ghost_token>" }
Body: {
  "token": "google_oauth_token",
  "provider": "google"
}
→ 201, returns account + user + tokens, action = "sign_up"
→ User now has accountId

# 3. Try signing up again (should fail)
POST /auth/authenticate (with same token)
→ 409 ACCOUNT_ALREADY_EXISTS or USER_ALREADY_LINKED
```

### Test 3: Existing Account Sign In
```bash
# 1. Sign in with existing account (NO auth header)
POST /auth/authenticate
Body: {
  "token": "google_oauth_token",
  "provider": "google"
}
→ 200, returns account + users + tokens, action = "sign_in"

# 2. Sign in with non-existent account
POST /auth/authenticate
Body: {
  "token": "unknown_oauth_token",
  "provider": "google"
}
→ 404 ACCOUNT_NOT_FOUND
```

### Test Account-Gated Features
```bash
# Ghost user (no account)
POST /me/report (with ghost user token)
→ 403 ACCOUNT_SETUP_REQUIRED

# Account holder
POST /me/report (with account holder token)
→ 200, generates and saves report
```

