# ViewAggregator Test Plan

## Goal
Test the ViewAggregator's ability to transform raw Bazi data into fortune reports with scores and insights.

## Test Strategy
- **Black box testing** with real BaziCalculator data
- **Incremental approach**: Write one test at a time, verify it passes
- **Focus on MVP**: Daily reports and chapter aggregation (landing page critical)
- **Validate scoring logic**: Ensure scores respond to favorable/unfavorable influences

---

## Test Cases (In Order)

### Phase 1: Basic Structure & Happy Path

#### ✅ Test 1: Daily Report - Basic Structure
**Given**: Valid birth data + target date  
**When**: Call `ViewAggregator.forDaily()`  
**Then**: 
- Returns FortuneReport with timeframe='daily'
- Has all required fields (scores, luckySymbols, hourlyBreakdown, technicalBasis, metadata)
- All scores are between 0-100
- Hourly breakdown has 12 two-hour windows

**Priority**: P0 (Critical for MVP)

---

#### Test 2: Daily Report - Score Calculation
**Given**: Same birth data, different dates (some with interactions, some without)  
**When**: Generate daily reports  
**Then**:
- Scores are NOT all exactly 50 (should vary based on influences)
- Days with favorable elements have higher scores
- Days with unfavorable elements have lower scores
- Overall score is reasonable average of sub-scores

**Priority**: P0 (Critical for MVP)

---

#### Test 3: Daily Report - Lucky Symbols
**Given**: Birth data with known favorable elements  
**When**: Generate daily report  
**Then**:
- Lucky numbers are derived from favorable elements (1-10 range)
- Lucky colors match traditional element mapping (Wood→Green, Fire→Red, etc.)
- Lucky directions match traditional element mapping (Wood→East, etc.)
- No duplicates in any symbol list

**Priority**: P0 (Critical for MVP)

---

#### Test 4: Daily Report - Technical Basis
**Given**: Birth data  
**When**: Generate daily report  
**Then**:
- technicalBasis.dayMaster matches base analysis
- technicalBasis.natalStructure matches raw data
- technicalBasis.luckEra matches raw data
- technicalBasis.favorableElements matches raw data
- technicalBasis.interactions is organized by category (career, wealth, etc.)

**Priority**: P0 (Critical for MVP)

---

### Phase 2: Aggregation

#### Test 5: Monthly Aggregation
**Given**: 7 daily reports (one week)  
**When**: Call `ViewAggregator.forMonthly()`  
**Then**:
- Returns FortuneReport with timeframe='monthly'
- Scores are average of daily scores
- Lucky symbols are union of daily symbols (deduplicated)
- trendData has weekly breakdown
- metadata.aggregatedFrom = 7

**Priority**: P1 (Phase 2)

---

#### Test 6: Chapter Aggregation (20 years)
**Given**: Mock yearly reports (3 years for testing)  
**When**: Call `ViewAggregator.forChapter()`  
**Then**:
- Returns FortuneReport with timeframe='chapter'
- Label includes "Age X-Y"
- Scores are averaged
- trendData shows yearly breakdown
- metadata.aggregatedFrom is total days

**Priority**: P0 (Critical for landing page)

---

### Phase 3: Edge Cases

#### Test 7: No Hour Pillar
**Given**: Birth data without birth time  
**When**: Generate daily report  
**Then**:
- Does not throw error
- Still generates valid scores
- Hourly breakdown still created (same score for all hours)

**Priority**: P1

---

#### Test 8: Neutral Day (No Interactions)
**Given**: Date with minimal/no interactions  
**When**: Generate daily report  
**Then**:
- Scores are near baseline (40-60 range)
- Does not crash or return invalid data

**Priority**: P1

---

#### Test 9: Determinism
**Given**: Same input data  
**When**: Generate report twice  
**Then**:
- Scores are identical
- Lucky symbols are identical
- Output is fully deterministic

**Priority**: P0 (Critical)

---

## Current Status

- [ ] Test 1: Basic Structure
- [ ] Test 2: Score Calculation
- [ ] Test 3: Lucky Symbols
- [ ] Test 4: Technical Basis
- [ ] Test 5: Monthly Aggregation
- [ ] Test 6: Chapter Aggregation
- [ ] Test 7: No Hour Pillar
- [ ] Test 8: Neutral Day
- [ ] Test 9: Determinism

---

## Notes

- Use consistent birth date: `1990-01-15 08:00 EST`
- Use consistent test date: `2026-01-09 12:00 EST`
- For aggregation tests, use smaller samples (7 days for monthly, 3 years for chapter)
- Check BaziCalculator API: `new BaziCalculator(birthDate, gender, timezone, isKnownTime)`

