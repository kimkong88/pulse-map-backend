# BaZi Tools for LLM

These tools provide structured data from the `bazi-calculator` library for LLM-based analysis.

## Tool Output Format: JSON

All tools return **structured JSON data**, not formatted text. This allows the LLM to:
- Parse data programmatically
- Extract specific fields
- Combine data from multiple tool calls
- Make intelligent decisions based on structured information

## Available Tools

### 1. `getBasicAnalysis()`

**Purpose:** Get static natal chart information

**Parameters:** None

**Returns:**
```json
{
  "specialStars": {
    "nobleman": ["丑", "未"],
    "intelligence": "寅",
    "skyHorse": "申",
    "peachBlossom": "酉"
  },
  "elementCounts": {
    "WOOD": 4,
    "FIRE": 0,
    "EARTH": 2,
    "METAL": 1,
    "WATER": 3
  },
  "dayMaster": {
    "stem": "甲",
    "element": "WOOD",
    "nature": "Yang"
  },
  "strength": {
    "level": "Strong",
    "score": 7.5,
    "notes": ["Supported by Water in month"]
  },
  "favorableElements": {
    "primary": ["WATER", "WOOD"],
    "secondary": ["METAL"],
    "unfavorable": ["FIRE"],
    "notes": ["Avoid Fire years"]
  }
}
```

### 2. `getYearPillars(years: number[])`

**Purpose:** Get year pillars for multiple years (batch operation)

**Parameters:**
- `years`: Array of years to check (e.g., `[2026, 2027, 2028]`)

**Returns:**
```json
[
  {
    "year": 2026,
    "stem": "丙",
    "branch": "午",
    "stemElement": "FIRE",
    "branchElement": "FIRE"
  }
]
```

### 3. `getLuckPillarAtAge(age: number)`

**Purpose:** Get the active Luck Pillar (大運) for a specific age

**Parameters:**
- `age`: Age to check (e.g., `37`)

**Returns:**
```json
{
  "age": 37,
  "stem": "壬",
  "branch": "子",
  "ageStart": 33,
  "yearStart": 2024,
  "yearEnd": 2034
}
```

### 4. `getYearInteractions(year: number)`

**Purpose:** Get interactions between natal chart and a specific year

**Parameters:**
- `year`: Year to analyze (e.g., `2027`)

**Returns:**
```json
{
  "year": 2027,
  "clashes": [...],
  "harmonies": [...],
  "harms": [],
  "punishments": []
}
```

