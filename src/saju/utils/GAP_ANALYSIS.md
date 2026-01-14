# Gap Analysis: Bazi Data Extraction

**Date:** 2026-01-08  
**Purpose:** Determine what the library provides vs what we need to implement

---

## What Library Provides (from index.d.ts)

### CompleteAnalysis (Natal Chart)
```typescript
{
  basicAnalysis: {
    dayMaster: { element, nature },           // ✅ Day Master
    favorableElements: { primary, unfavorable }, // ✅ Element favorability
  },
  detailedPillars: {
    year: { 
      heavenlyStemTenGod: TenGodInfo | null,  // ✅ Year pillar Ten God vs Day Master
    },
    month: { 
      heavenlyStemTenGod: TenGodInfo | null,  // ✅ Month pillar Ten God vs Day Master
    },
    day: { 
      heavenlyStemTenGod: TenGodInfo | null,  // ✅ Day pillar (always null - self)
    },
    hour: { 
      heavenlyStemTenGod: TenGodInfo | null,  // ✅ Hour pillar Ten God vs Day Master
    },
  },
  luckPillars: {
    pillars: LuckPillarData[],                // ✅ All luck eras
  },
  interactions: InteractionDetail[],          // ✅ Natal chart interactions
}
```

### PersonalizedDailyAnalysisOutput (Daily Analysis)
```typescript
{
  date: string,                               // ✅ Date
  dayPillar: {
    stemElement: ElementType,                 // ✅ Daily element
    stemYinYang: YinYangType,                 // ✅ Daily polarity
  },
  currentLuckPillarSnap: {
    tenGodVsNatalDayMaster: TenGodInfo | null, // ✅ Current luck era Ten God
    yearStart: number,                        // ✅ Luck era period
    yearEnd: number,
  },
  interactions: InteractionDetail[],          // ✅ All daily interactions
}
```

### InteractionDetail
```typescript
{
  type: InteractionType,                      // ✅ Interaction type
  participants: InteractionParticipant[],     // ✅ Which pillars involved
  description: string,                        // ✅ Human-readable description
  location: InteractionLocation,              // ✅ Natal, Natal-Annual, etc.
  involvesFavorableElement: boolean,          // ✅ Element favorability flag
  involvesUnfavorableElement: boolean,
  affectedPillarStemsTenGods: TenGodInfo[],  // ✅ Ten Gods of affected pillars
}
```

---

## What We Need (Application Requirements)

### 1. Life Area Mapping (Custom UX)
**Need:** Map traditional pillars to modern life areas
```
Year Pillar   → Social Life Area
Month Pillar  → Career Life Area
Day Pillar    → Personal Life Area
Hour Pillar   → Innovation Life Area
```

**Library Provides:** Pillar data with Ten Gods  
**Gap:** Simple mapping/transformation (not a calculation)

### 2. Interaction Attribution
**Need:** Identify which life area is affected by each interaction
```
Interaction participant "Natal Year" → Social area
Interaction participant "Natal Month" → Career area
Interaction participant "Natal Day" → Personal area
Interaction participant "Natal Hour" → Innovation area
```

**Library Provides:** `participants[].pillar` (Year/Month/Day/Hour)  
**Gap:** Simple mapping/transformation (not a calculation)

### 3. Structured Daily Data
**Need:** Combine natal + daily analysis into single structure
```typescript
{
  date: Date,
  luckEra: { ... },
  natalStructure: { social, career, personal, innovation },
  interactions: [ ... ],
  favorableElements: { ... }
}
```

**Library Provides:** All raw data in separate objects  
**Gap:** Simple data transformation (not a calculation)

---

## What We DON'T Need

### ❌ Custom Ten God Calculation
- **Previous Implementation:** `calculateTenGod()` with modulo math
- **Reality:** Library already provides `heavenlyStemTenGod` for all pillars
- **Action:** DELETE custom calculation, use library data directly

### ❌ "Daily Theme" (Transit Day vs Day Master)
- **Previous Implementation:** Calculate Ten God of daily pillar vs natal day master
- **Reality:** Not traditional Bazi (library explicitly returns null for self-relationships)
- **Action:** REMOVE this concept entirely

### ❌ Premature Weighting
- **Previous Implementation:** `INTERACTION_WEIGHTS` applied in interpreter
- **Reality:** Weighting is view-specific (daily vs monthly vs yearly)
- **Action:** MOVE to ViewAggregator

---

## Wheel Reinvention Audit

### ✅ Checked: Library Type Definitions
- Read: `node_modules/@aharris02/bazi-calculator-by-alvamind/dist/index.d.ts`
- Confirmed: Library provides all Ten God calculations we need

### ✅ Checked: Library Runtime Behavior
- Tested: Multiple birth dates and target dates
- Confirmed: `heavenlyStemTenGod` populated for natal pillars (except Day = self)
- Confirmed: `tenGodVsNatalDayMaster` populated for luck era
- Confirmed: `affectedPillarStemsTenGods` populated for interactions

### ✅ Checked: Traditional Bazi Philosophy
- Confirmed: "Daily theme" (random day vs day master) is NOT traditional
- Confirmed: Ten Gods are meaningful only in context (natal structure, luck era, interactions)
- Confirmed: Self-relationships correctly return null

---

## Implementation Plan

### Step 1: Create `BaziDataExtractor` (New)
**Purpose:** Extract and transform library data (NO calculations)

**Responsibilities:**
- Combine CompleteAnalysis + PersonalizedDailyAnalysisOutput
- Map pillars → life areas (simple lookup)
- Map interactions → affected life areas (simple participant inspection)
- Pass through all library data unchanged

**NOT Responsible For:**
- Calculating Ten Gods (library does this)
- Weighting/scoring (ViewAggregator does this)
- Interpretation (ViewAggregator does this)

**Size Estimate:** ~50-100 lines (vs current 324 lines)

### Step 2: Update `ViewAggregator`
**Changes:**
- Accept new data structure from BaziDataExtractor
- Keep weighting logic (correct place)
- Add statistical analysis for identifying significant periods
- Add aggregation methods (monthly, yearly, chapter)

### Step 3: Update Types
**Changes:**
- Rename `RawSajuInterpretation` → `RawBaziData`
- Remove non-traditional fields (e.g., daily theme context)
- Add fields for library data we're now using directly

### Step 4: Delete Obsolete Files
- `saju.interpreter.ts` (replaced by BaziDataExtractor)
- `saju.interpreter.spec.ts` (tests for deleted functionality)
- Update `ARCHITECTURE.md`

---

## Validation Checklist

Before implementation:
- [x] Read library type definitions
- [x] List what library provides
- [x] List what we need
- [x] Document gaps
- [x] Validate against domain philosophy
- [x] Justify custom implementation
- [x] Check for wheel reinvention

Custom implementation justified:
- [x] Pillar → Life Area mapping (UX requirement, not in library)
- [x] Data structure transformation (combining sources)
- [x] Interaction → Life Area attribution (UX requirement)

NOT implementing:
- [x] Ten God calculations (library provides)
- [x] Daily theme (not traditional)
- [x] Premature weighting (belongs in aggregator)

---

## Summary

**Library Coverage:** ~95% of domain logic  
**Our Gap:** ~5% simple mappings/transformations  
**Previous Implementation:** ~70% unnecessary (wheel reinvention)  

**Action:** Complete rewrite using library-first approach

