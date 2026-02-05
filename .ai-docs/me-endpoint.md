# `/me` Endpoint Documentation

## Overview
The `/me` endpoint returns the authenticated user's profile data combined with their complete Saju analysis.

## Endpoint

```
GET /me
```

**Authentication:** Required (uses `AuthGuard`)

## Response Structure

```typescript
{
  user: {
    id: string;
    fullName: string;
    birthDate: Date;
    birthLocation: string;
    birthTimezone: string;
    currentLocation: string;
    currentTimezone: string;
    isTimeKnown: boolean;
  },
  identity: {
    code: string;        // e.g., "Fire-I"
    title: string;       // e.g., "The Expressive Catalyst"
    element: string;     // e.g., "Fire"
    polarity: string;    // e.g., "Yin" or "Yang"
  },
  rarity: {
    oneIn: number;       // e.g., 1800000
    description: string; // e.g., "1 in 1,800,000"
  },
  specialTraits: [
    {
      name: string;           // e.g., "Noble Character"
      chineseName: string;    // e.g., "天乙貴人"
      rarity: string;         // e.g., "~1 in 12 charts"
      description: string;    // Explanation of the trait
      emoji?: string;         // e.g., "👑"
    }
    // ... more traits (typically 0-4 traits)
  ]
}
```

## UI Mapping

Based on the PulseMap UI, here's how the data maps:

### Header Section
- **Title**: `identity.title`
  - e.g., "The Expressive Catalyst"
- **Overall Rarity**: `rarity.oneIn`
  - e.g., "1 in 1,800,000"

### "What Makes You Special" Section
- **Source**: `specialTraits` array
- Each trait card shows:
  - `trait.name` (e.g., "Noble Character")
  - `trait.rarity` (e.g., "~1 in 12 charts")
  - `trait.description` (explanation text)

### "Your Information" Section
- **Name**: `user.fullName`
- **Date of Birth**: `user.birthDate` (formatted with time if `user.isTimeKnown` is true)
- **City of Birth**: `user.birthLocation`
- **Current City**: `user.currentLocation`

## Implementation Details

### Files Created/Modified
1. **`prisma/me/me.controller.ts`** - Handles the `/me` GET request
2. **`prisma/me/me.service.ts`** - Fetches user data and calls `SajuService.getBasicProfile()`
3. **`prisma/me/me.module.ts`** - Module configuration
4. **`src/saju/saju.service.ts`** - Added new `getBasicProfile()` method (lightweight, no LLM)

### Dependencies
- `SajuModule` - Provides saju analysis
- `AuthModule` - Provides authentication guards
- `usersRepository` - Fetches user data from database

### Flow
1. User makes authenticated request to `GET /me`
2. `AuthGuard` validates token and attaches user context
3. Controller extracts `userId` from context
4. Service fetches user data from database
5. Service calls `sajuService.getBasicProfile()` with user's birth data
   - **Fast calculation** (~100ms)
   - **No LLM calls** (no cost, no latency)
   - Returns: identity, rarity, special traits
6. Combined response is returned

## Performance

### Why `getBasicProfile()` instead of `getPersonalAnalysis()`?

The full `getPersonalAnalysis()` method makes 2+ LLM calls:
- ❌ `generateIntroduction()` - async LLM call
- ❌ `generateConclusion()` - async LLM call
- ❌ Slow (~2-5 seconds response time)
- ❌ Expensive (LLM costs per request)
- ❌ Called frequently (every profile view)

The new `getBasicProfile()` method:
- ✅ Only factual calculations (no LLM)
- ✅ Fast (~100ms response time)
- ✅ Free (no LLM costs)
- ✅ Returns exactly what's needed for the UI

## Notes

- The endpoint is simple and focused - no over-complication
- Questions section is intentionally not implemented yet (as requested)
- All data needed for the profile page is included in a single request
- Optimized for performance (no LLM calls for frequently accessed endpoint)

