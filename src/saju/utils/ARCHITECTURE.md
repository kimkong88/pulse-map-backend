# Bazi Analysis Architecture

## Overview

This system extracts and aggregates data from the `@aharris02/bazi-calculator-by-alvamind` library to provide Bazi-based life insights.

**Philosophy**: 95% of domain logic comes from the library. Our role is simple transformation and intelligent aggregation.

## Architecture Layers

```
┌─────────────────────────────────────────────────────────────┐
│  Calculator Library (@aharris02/bazi-calculator-by-alvamind)│
│  Provides: CompleteAnalysis + PersonalizedDailyAnalysisOutput│
│  - Natal chart with Ten Gods                                │
│  - Luck Era with Ten Gods                                   │
│  - Daily interactions with Ten Gods                         │
│  - Element favorability                                      │
└───────────────────────┬─────────────────────────────────────┘
                        │
                        ▼
         ┌──────────────────────────────┐
         │  BaziDataExtractor            │
         │  (SIMPLE TRANSFORMATION)      │
         │  - Map pillars → life areas   │
         │  - Combine natal + daily data │
         │  - Pass through library data  │
         │  - NO calculations            │
         │  Returns: RawBaziData         │
         └──────────────┬─────────────────┘
                        │
                        ▼
         ┌──────────────────────────────┐
         │  ViewAggregator               │
         │  (INTELLIGENT ANALYSIS)       │
         │  - Apply weighting            │
         │  - Identify significant periods│
         │  - Calculate intensity         │
         │  - Statistical analysis        │
         │  Returns: View-specific output│
         └──────────────┬─────────────────┘
                        │
                        ▼
                   LLM / API
```

## What Library Provides (No Wheel Reinvention!)

### ✅ Ten God Calculations
- **Natal pillars**: `heavenlyStemTenGod` for Year/Month/Hour (Day = null, as it's self)
- **Luck Era**: `tenGodVsNatalDayMaster` for current 10-year phase
- **Interactions**: `affectedPillarStemsTenGods` for active events

### ✅ Element Favorability
- **Primary favorable**: Elements that strengthen chart
- **Unfavorable**: Elements that weaken chart
- Used to evaluate daily element quality

### ✅ Interaction Analysis
- **Types**: StemClash, BranchCombo, etc.
- **Participants**: Which pillars involved (Natal/Annual/Monthly/Daily)
- **Descriptions**: Human-readable explanations
- **Favorability flags**: Involves favorable/unfavorable elements

## What We Add (5% Custom Logic)

### 1. Pillar → Life Area Mapping (UX Layer)
Traditional Bazi uses Year/Month/Day/Hour pillars.
We map these to modern life contexts:

```
Year Pillar   → Social Life Area       (ancestors, society, early life)
Month Pillar  → Career Life Area       (career, income, mid-life)
Day Pillar    → Personal Life Area     (self, health, relationships)
Hour Pillar   → Innovation Life Area   (children, legacy, future)
```

**Why**: Makes Bazi accessible to modern users without losing authenticity.

### 2. Data Structure Transformation
Library returns separate objects (`CompleteAnalysis` + `PersonalizedDailyAnalysisOutput`).
We combine into single `RawBaziData` structure for easier consumption.

**Why**: Simplifies downstream processing without adding interpretation.

### 3. Significant Period Identification (Planned)
Analyze arrays of daily data to identify:
- **Monthly**: "Days 10-15 show peak activity"
- **Yearly**: "March and September are high-activity months"
- **Decade**: "2024 and 2028 are significant years"

**Why**: Users need insights, not just raw data. But insights must be statistical, not invented.

## Key Types

### RawBaziData (From Extractor)
```typescript
{
  date: Date,
  
  // Direct from library
  luckEra: {
    tenGod: string | null,  // From library's tenGodVsNatalDayMaster
    stemElement: ElementType,
    stemYinYang: YinYangType,
  },
  
  // Direct from library (with pillar→area mapping)
  natalStructure: {
    social: { tenGod, element, yinYang },     // From Year.heavenlyStemTenGod
    career: { tenGod, element, yinYang },     // From Month.heavenlyStemTenGod
    personal: { tenGod: null, ... },          // Day pillar (always null - self)
    innovation: { tenGod, element, yinYang }, // From Hour.heavenlyStemTenGod
  },
  
  // Direct from library
  favorableElements: {
    primary: ElementType[],
    secondary: ElementType[],
    unfavorable: ElementType[],
  },
  
  // Direct from library
  dailyElement: ElementType,
  
  // Transformed from library interactions
  lifeAreas: {
    social: { active, triggers: [...] },
    career: { active, triggers: [...] },
    personal: { active, triggers: [...] },
    innovation: { active, triggers: [...] },
  }
}
```

### RawTrigger (Interaction Data)
```typescript
{
  type: string,                 // From library: "StemClash", "BranchCombo", etc.
  source: 'Daily' | 'Monthly' | 'Annual',
  description: string,           // From library's interaction.description
  involvesFavorable: boolean,    // From library's involvesFavorableElement
  involvesUnfavorable: boolean,  // From library's involvesUnfavorableElement
  affectedTenGods: string[],     // From library's affectedPillarStemsTenGods
}
```

**Note**: No intensity/weighting at this layer. That's ViewAggregator's job.

## Traditional Bazi Philosophy (What We DON'T Do)

### ❌ "Daily Theme" (Transit Day vs Day Master)
**NOT traditional**: Random daily pillar vs day master has no inherent meaning without interaction.
**Library behavior**: Returns `null` for self-relationships (correct).
**Our approach**: Only show Ten Gods where library provides them (natal structure, luck era, interactions).

### ❌ Net Scoring (-50 + 50 = 0)
**Problem**: Extreme day (major good + major bad) looks same as quiet day (nothing happened).
**Solution**: Track intensity and balance separately:
```typescript
{
  intensity: positiveCount + negativeCount,  // How much happened
  balance: positiveCount - negativeCount,     // Net good/bad
}
```

### ❌ Premature Interpretation
**Problem**: Extractor shouldn't decide what's "significant".
**Solution**: Extractor outputs facts, ViewAggregator applies statistics/thresholds.

## Usage Examples

### Daily Fortune
```typescript
import { BaziDataExtractor } from './utils/bazi.extractor';
import { ViewAggregator } from './utils/view.aggregator';

// 1. Get data from library
const baseChart = calculator.getCompleteAnalysis();
const daily = calculator.getAnalysisForDate(today, timezone, { type: 'personalized' });

// 2. Extract facts (simple transformation)
const raw = BaziDataExtractor.extract(baseChart, daily);

// 3. Apply daily-centric weighting
const dailyOutput = ViewAggregator.forDaily(raw);

// 4. Send to LLM
await llm.generate({ prompt: buildDailyPrompt(dailyOutput) });
```

### Monthly Report (Planned)
```typescript
// 1. Get all days in month from library
const monthDays = calculator.getAnalysisForDateRange(
  monthStart, monthEnd, timezone, { type: 'personalized' }
);

// 2. Extract facts for each day
const rawDays = monthDays.map(day => 
  BaziDataExtractor.extract(baseChart, day)
);

// 3. Identify significant periods
const monthlyReport = ViewAggregator.aggregateMonthly(rawDays);
// Output: {
//   significantPeriods: [
//     { dayRange: [10, 15], type: 'high-activity', avgInteractions: 7.5 },
//     { dayRange: [20, 25], type: 'quiet', avgInteractions: 0.8 }
//   ],
//   monthlyPillar: "Yin Wood Ox",
//   overallIntensity: 3.2
// }

// 4. Send to LLM
await llm.generate({ prompt: buildMonthlyPrompt(monthlyReport) });
```

## Weighting Strategy (ViewAggregator's Responsibility)

### Daily View: "What matters TODAY?"
```typescript
{
  Daily: 1.0,    // Most immediate
  Monthly: 0.6,  // Context
  Annual: 0.4,   // Background
}
```

### Monthly View: "What's the pattern this month?"
```typescript
{
  Daily: 0.4,    // Individual days aggregate
  Monthly: 1.0,  // Primary focus
  Annual: 0.7,   // Important context
}
```

### Annual View: "What's the big picture?"
```typescript
{
  Daily: 0.2,    // Noise level
  Monthly: 0.5,  // Monthly patterns
  Annual: 1.0,   // Primary focus
}
```

## Why This Design?

### 1. Library-First
- Library does 95% of domain logic
- We only add UX transformation
- No wheel reinvention

### 2. Traditional Philosophy
- Only show Ten Gods where library provides them
- No invented daily themes
- Honest about quiet days (no false significance)

### 3. Testability
- Extractor is deterministic (same input → same output)
- No premature interpretation to mock
- Easy to verify against library output

### 4. Scalability
- Same extractor serves all views
- Easy to add new aggregation modes
- Statistical analysis separate from fact extraction

## Testing Strategy

### BaziDataExtractor Tests
```typescript
describe('BaziDataExtractor', () => {
  it('should use library Ten Gods directly (no calculation)', () => {
    const raw = BaziDataExtractor.extract(base, daily);
    
    // Verify we're using library's Ten God, not calculating
    expect(raw.natalStructure.social.tenGod).toBe(
      base.detailedPillars.year.heavenlyStemTenGod?.name
    );
  });
  
  it('should map pillars to life areas correctly', () => {
    const raw = BaziDataExtractor.extract(base, daily);
    
    // Year → social, Month → career, Day → personal, Hour → innovation
    expect(raw.natalStructure.social).toBeDefined();
    expect(raw.natalStructure.career).toBeDefined();
  });
  
  it('should be deterministic', () => {
    const result1 = BaziDataExtractor.extract(base, daily);
    const result2 = BaziDataExtractor.extract(base, daily);
    
    expect(result1).toEqual(result2);
  });
});
```

### ViewAggregator Tests (Future)
```typescript
describe('ViewAggregator', () => {
  it('should identify significant day ranges in monthly data', () => {
    const monthlyData = /* 31 days of RawBaziData */;
    const report = ViewAggregator.aggregateMonthly(monthlyData);
    
    expect(report.significantPeriods).toContainEqual({
      dayRange: [10, 15],
      type: 'high-activity',
      avgInteractions: expect.any(Number)
    });
  });
});
```

## Design Principles (From Cursor Rules)

### 1. Library Exploration BEFORE Implementation
- Read `index.d.ts` completely
- List what library provides
- Identify true gaps (not assumptions)
- Implement only gaps

### 2. Domain Philosophy Validation
- Ten Gods only where library provides them
- No invented daily themes
- Honest about "no data" days
- Traditional > modern convenience

### 3. Naming Reflects Reality
- `BaziDataExtractor` not `SajuInterpreter` (we extract, not interpret)
- `extract()` not `interpret()` (transformation, not calculation)
- `RawBaziData` not `RawSajuInterpretation` (facts, not interpretation)

### 4. Periodic Reality Checks
- Every 100 lines: "Does library already do this?"
- Every feature: "Is this traditional?"
- Every complexity: "Can this be simpler?"

## Migration from Old System

### Removed: Custom Ten God Calculation
**Before**: `calculateTenGod()` with 5-element modulo math
**After**: Use `base.detailedPillars.year.heavenlyStemTenGod` (library provides)
**Why**: Wheel reinvention - library already calculates this

### Removed: Daily Theme (Transit Day vs Day Master)
**Before**: Calculate Ten God for daily pillar vs natal day master
**After**: Removed entirely
**Why**: Not traditional Bazi - library correctly returns `null` for self-relationships

### Moved: Interaction Weighting
**Before**: `INTERACTION_WEIGHTS` applied in interpreter
**After**: Weighting done in ViewAggregator
**Why**: Weighting is view-specific (daily vs monthly weighs differently)

## Future Enhancements

### 1. Statistical Period Identification
```typescript
ViewAggregator.aggregateMonthly(rawDays) {
  // Identify clusters of high/low activity
  // Use thresholds (e.g., >2 std dev = significant)
  // Return structured periods: "Days 10-15 have X pattern"
}
```

### 2. Intensity + Balance Metrics
```typescript
{
  intensity: favorableCount + unfavorableCount,  // Total activity
  balance: favorableCount - unfavorableCount,    // Net outcome
  volatility: stdDev(daily intensities),         // Stability measure
}
```

### 3. Multi-Scale Aggregation
- Daily → Weekly patterns
- Weekly → Monthly themes
- Monthly → Yearly trends
- Yearly → Decade evolution

## References

- **Gap Analysis**: `src/saju/utils/GAP_ANALYSIS.md`
- **Cursor Rules**: `.cursor/rules/RULE.md`
- **Library Types**: `node_modules/@aharris02/bazi-calculator-by-alvamind/dist/index.d.ts`
