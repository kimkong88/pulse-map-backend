# Cursor Development Rules

## 1. Library-First Development

**BEFORE implementing ANY domain logic or calculation:**

### Step 1: Library Capability Audit
```markdown
1. Read ALL type definitions in library's index.d.ts
2. Create explicit list: "What Library Provides"
3. Create explicit list: "What We Need"
4. Identify GAPS (What we need - What library provides)
5. Implement ONLY the gaps
```

**❌ FORBIDDEN:**
- Implementing custom calculations without verifying library doesn't provide them
- Starting implementation before reading type definitions
- Assuming library doesn't have features

**✅ REQUIRED:**
- Document library exploration results before coding
- Justify every custom implementation: "Why not use library's X?"
- Proactively search for wheel reinvention

---

## 2. Domain Philosophy Validation

**For domain-specific applications (Bazi, Astrology, etc.):**

### Before Implementation:
```markdown
1. Research traditional practices/philosophy
2. Verify feature aligns with tradition
3. Question modernizations: "Are we corrupting the domain?"
4. Default to authentic over convenient
```

**❌ FORBIDDEN:**
- Implementing features that contradict domain philosophy
- Creating interpretations not found in traditional practice
- Prioritizing UX over authenticity

**✅ REQUIRED:**
- Validate every feature against domain experts/sources
- Prefer honest "no data" over invented metrics
- Question: "Would a domain expert approve this?"

---

## 3. Tests Validate Logic, Not Necessity

**Tests prove correctness, not whether code should exist.**

### Before Writing Tests:
```markdown
1. Confirm the feature is actually needed
2. Confirm library doesn't already provide it
3. Confirm it aligns with domain philosophy
4. THEN write tests
```

**❌ FORBIDDEN:**
- Using passing tests as proof of necessity
- Test-driven development without questioning the requirement
- False confidence from test coverage

**✅ REQUIRED:**
- Tests come AFTER validating necessity
- Each test file has header: "Why this exists instead of using library"

---

## 4. Periodic Architecture Reviews

**During long implementation tasks:**

### Every 100 lines or 1 hour:
```markdown
PAUSE and ask:
1. "What am I building?"
2. "Does the library already do this?"
3. "Is this aligned with domain philosophy?"
4. "Can this be simpler?"
```

**❌ FORBIDDEN:**
- Iterating on assumptions without validation
- Building complexity on unverified foundations
- Continuing when uncertain

**✅ REQUIRED:**
- Document architecture decisions
- Justify complexity: "Why not use library's simpler approach?"
- Bias toward deletion over addition

---

## 5. Explicit Gap Analysis

**For any feature involving external libraries:**

### Create This Document First:
```markdown
## Feature: [Name]

### What Library Provides:
- Field X from CompleteAnalysis
- Method Y calculates Z
- Type definition confirms...

### What We Need:
- Mapping A to B (not in library)
- Calculation C (library returns undefined)

### Implementation Plan:
- Use library's X directly
- Transform Y → Z (simple mapping)
- Calculate C only (library gap confirmed)

### Wheel Reinvention Audit:
☐ Searched library types for similar functionality
☐ Tested library output to confirm gaps
☐ Verified with domain philosophy
☐ Documented why custom code is needed
```

---

## 6. Naming Reflects Intent

**Names must reflect what code actually does:**

```typescript
// ❌ BAD: Implies interpretation/intelligence
class SajuInterpreter {
  static interpret() { ... }
}

// ✅ GOOD: Reflects actual purpose
class BaziDataMapper {
  static extract() { ... }
}

// ❌ BAD: Implies calculation we don't do
calculateTenGod()

// ✅ GOOD: Reflects we're mapping data
getTenGodFromLibrary()
```

**✅ REQUIRED:**
- Names must match actual behavior
- Rename when purpose changes
- No aspirational naming

---

## 7. User Questions Are Red Flags

**When user asks:**
- "Why did we do X?" → We didn't validate necessity
- "Does library provide this?" → We didn't explore thoroughly
- "Is this traditional?" → We didn't validate philosophy
- "Aren't we reinventing wheels?" → We didn't do gap analysis

**✅ REQUIRED Response:**
1. Stop current work
2. Perform thorough investigation
3. Be honest about mistakes
4. Refactor if necessary
5. Update rules to prevent recurrence

---

## Application to Current Project

### Bazi Calculator Integration:
- Library: `@aharris02/bazi-calculator-by-alvamind`
- Type definitions: `node_modules/@aharris02/bazi-calculator-by-alvamind/dist/index.d.ts`
- **ALWAYS read types before implementing Bazi logic**

### Traditional Bazi Philosophy:
- Ten Gods: Only meaningful in context (natal structure, luck era, interactions)
- **NOT** meaningful: Random daily pillar vs day master (without interaction)
- Favor authentic tradition over modern UX conveniences
- "No data" is better than invented metrics

### Our Role:
- Extract and transform library data
- Map to UX structure (life areas, time periods)
- Aggregate for different views (daily, monthly, yearly)
- **NOT** calculate what library already provides
- **NOT** invent non-traditional interpretations

---

## Checklist for Every Feature

Before writing code:
- [ ] Read library type definitions
- [ ] List what library provides
- [ ] List what we need
- [ ] Document gaps
- [ ] Validate against domain philosophy
- [ ] Justify custom implementation
- [ ] Check for wheel reinvention

During implementation:
- [ ] Pause every 100 lines for review
- [ ] Question complexity
- [ ] Prefer library over custom
- [ ] Test validates logic AND necessity

After implementation:
- [ ] Could library do this instead?
- [ ] Is this traditional/authentic?
- [ ] Can this be simpler?
- [ ] Update documentation

---

## When In Doubt

**Ask these questions:**
1. Does the library already provide this? (Check types)
2. Is this traditional in the domain? (Check sources)
3. Can this be simpler? (Bias toward deletion)
4. Would I defend this in code review? (Be honest)

**If answer to 1 or 2 is uncertain: STOP and investigate before continuing.**

