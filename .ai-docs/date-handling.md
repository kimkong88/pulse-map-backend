# Date Handling in Saju Backend

## ⚠️ **Critical: Birth Date Format**

### **Frontend → Backend API Contract**

When creating a user, send `birthDate` as an **ISO 8601 string WITHOUT timezone**:

```typescript
// ✅ CORRECT
{
  "fullName": "John Doe",
  "birthDate": "1988-06-11T19:00:00",  // No .000Z suffix!
  "birthTimezone": "Asia/Seoul",
  "gender": "male",
  "isTimeKnown": true,
  // ... other fields
}

// ❌ WRONG
{
  "birthDate": "1988-06-11T19:00:00.000Z",  // Has .000Z = UTC time
  "birthTimezone": "Asia/Seoul",
  // ...
}
```

### **Why This Matters**

The `birthDate` represents the **local time at birth**, not UTC time. The `birthTimezone` field tells us which timezone that local time is in.

**Example:**
- Born: June 11, 1988, 7:00 PM in Seoul
- Correct: `birthDate: "1988-06-11T19:00:00"` + `birthTimezone: "Asia/Seoul"`
- Wrong: `birthDate: "1988-06-11T10:00:00.000Z"` (this is 7PM Seoul in UTC)

### **Format Requirements**

```regex
^\\d{4}-\\d{2}-\\d{2}T\\d{2}:\\d{2}:\\d{2}$
```

- **Date:** `YYYY-MM-DD`
- **Time:** `HH:mm:ss` (24-hour format)
- **Separator:** `T`
- **NO timezone suffix** (no `.000Z`, no `+09:00`)

### **Validation**

The backend validates:
1. ✅ Valid ISO 8601 format
2. ✅ No timezone suffix
3. ✅ Valid date/time values

If validation fails, you'll get:
```json
{
  "statusCode": 400,
  "message": [
    "birthDate must be in ISO format without timezone (YYYY-MM-DDTHH:mm:ss)"
  ],
  "error": "Bad Request"
}
```

## **Backend → Frontend Response**

When you GET user data, `birthDate` will be returned as:
```json
{
  "birthDate": "1988-06-11T19:00:00.000Z",  // Database adds .000Z
  "birthTimezone": "Asia/Seoul"
}
```

**To display to users:**
1. Parse the `birthDate` ISO string
2. Display it in the context of `birthTimezone`
3. Don't use the `.000Z` as actual timezone - it's just storage format

## **How Backend Handles It**

```typescript
// 1. Frontend sends
const request = {
  birthDate: "1988-06-11T19:00:00",  // Local time
  birthTimezone: "Asia/Seoul"
};

// 2. Backend validates (no .000Z allowed)
// 3. Backend stores in PostgreSQL (adds .000Z for storage)

// 4. When calculating Saju:
import { toDate } from 'date-fns-tz';

// Remove .000Z and interpret as local time in birth timezone
const localBirthDate = toDate("1988-06-11T19:00:00", { 
  timeZone: "Asia/Seoul" 
});

// 5. Pass to BaziCalculator
new BaziCalculator(localBirthDate, "male", "Asia/Seoul", true);
```

## **Common Mistakes**

### ❌ **Mistake 1: Sending user's current timezone**
```javascript
// Wrong!
const birthDate = new Date("1988-06-11T19:00:00").toISOString();
// This converts to user's LOCAL timezone, not birth timezone
```

### ✅ **Correct:**
```javascript
// Right!
const birthDate = "1988-06-11T19:00:00"; // Keep as string, no conversion
```

### ❌ **Mistake 2: Converting to UTC before sending**
```javascript
// Wrong!
const utcDate = new Date(localDate).toISOString();
```

### ✅ **Correct:**
```javascript
// Right!
const isoString = `${year}-${month}-${day}T${hour}:${minute}:${second}`;
```

## **Affected Endpoints**

All endpoints that accept birth date/time information:

### **1. POST `/users`** (Create User)
```json
{
  "fullName": "Test User",
  "birthDate": "1988-06-11T19:00:00",  // ✅ ISO string, no timezone
  "birthLocation": "Seoul, South Korea",
  "birthTimezone": "Asia/Seoul",
  "currentLocation": "New York, USA",
  "currentTimezone": "America/New_York",
  "gender": "male",
  "isTimeKnown": true
}
```

### **2. POST `/reports/personal`** (Personal Report)
```json
{
  "birthDateTime": "1988-06-11T19:00:00",  // ✅ ISO string, no timezone
  "birthTimezone": "Asia/Seoul",
  "gender": "male",
  "isTimeKnown": true
}
```

### **3. POST `/reports/compatibility`** (Compatibility Report)
```json
{
  "person1": {
    "birthDateTime": "1988-06-11T19:00:00",  // ✅ ISO string, no timezone
    "birthTimezone": "Asia/Seoul",
    "gender": "male",
    "isTimeKnown": true
  },
  "person2": {
    "birthDateTime": "1990-03-15T14:30:00",  // ✅ ISO string, no timezone
    "birthTimezone": "America/New_York",
    "gender": "female",
    "isTimeKnown": true
  },
  "isTeaser": true
}
```

## **Testing**

Use this test data for **POST `/users`**:
```json
{
  "fullName": "Test User",
  "birthDate": "1988-06-11T19:00:00",
  "birthLocation": "Seoul, South Korea",
  "birthTimezone": "Asia/Seoul",
  "currentLocation": "New York, USA",
  "currentTimezone": "America/New_York",
  "gender": "male",
  "isTimeKnown": true
}
```

Use this test data for **POST `/reports/personal`**:
```json
{
  "birthDateTime": "1988-06-11T19:00:00",
  "birthTimezone": "Asia/Seoul",
  "gender": "male",
  "isTimeKnown": true
}
```

**Expected Result:**
- Day Master: 丁酉 (Fire-I / Yin Fire Rooster)
- Title: "The Focused Refiner"

**If you get:**
- Day Master: 戊戌 (Earth-O)
- Title: "The Grounded Guardian"

→ Your date is being converted to wrong timezone!

## **Summary**

| Field | Format | Example | Notes |
|-------|--------|---------|-------|
| `birthDate` | ISO string (no TZ) | `"1988-06-11T19:00:00"` | Local time at birth |
| `birthTimezone` | IANA timezone | `"Asia/Seoul"` | Timezone of birth location |
| Combined meaning | - | 7:00 PM Seoul time on June 11, 1988 | - |

