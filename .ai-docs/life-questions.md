# Life Questions Feature

## Overview

The Life Questions feature allows users to ask specific questions about their life path (wealth, marriage, career, success, etc.) and receive AI-generated insights based on their BaZi (Four Pillars of Destiny) chart.

## Architecture

### Components

1. **Questions Service** (`src/questions/questions.service.ts`)
   - Core logic for answering questions using AI + BaZi tools
   - Mock questions for testing (not using DB yet)
   - Generates engaging, accessible responses without jargon

2. **Questions Controller** (`src/questions/questions.controller.ts`)
   - REST endpoints for listing and answering questions
   - Authenticated endpoint for generating answers

3. **BaZi Tools** (`src/saju/tools/`)
   - 4 subject-agnostic tools that provide factual data to the LLM
   - Used by the AI to answer questions accurately

## API Endpoints

### GET /questions
Returns all available questions (mock data for now)

**Response:**
```json
[
  {
    "id": "wealth",
    "title": "When will I get rich?",
    "category": "wealth",
    "preview": "Discover your optimal wealth accumulation periods...",
    "isPremium": true
  }
]
```

### GET /questions/:id
Get a specific question by ID

### POST /questions/:id/answer
Answer a question with AI analysis (requires authentication)

**Request:**
```json
{
  "questionId": "wealth",
  "birthDate": "1988-06-11T19:00:00",
  "gender": "male",
  "birthTimezone": "Asia/Seoul",
  "isTimeKnown": true
}
```

**Response:**
```json
{
  "question": {
    "id": "wealth",
    "title": "When will I get rich?",
    "category": "wealth"
  },
  "answer": {
    "fullText": "AI-generated response...",
    "sections": [
      { "content": "Opening hook..." },
      { "content": "Key insights..." }
    ]
  },
  "metrics": {
    "likelihood": 75,
    "timingClarity": 85,
    "challengeLevel": 60
  },
  "metadata": {
    "age": 37,
    "toolCallsCount": 4,
    "tokensUsed": 1523
  }
}
```

## Entertainment Metrics

To make the experience more engaging, the LLM generates **3 metrics** that can be visualized:

### Metrics Explained

1. **Likelihood** (0-100)
   - How favorable/likely this outcome is based on their chart
   - Example: "When will I get rich?" → 75 = Strong wealth indicators
   - Visual: Progress bar, gauge, or percentage

2. **Timing Clarity** (0-100)
   - How clear the timing indicators are in their chart
   - Example: Specific year interactions → 85 = Very clear timing
   - Visual: Confidence meter, clarity indicator

3. **Challenge Level** (0-100)
   - How much effort/obstacles are involved
   - Example: Weak chart support → 80 = High challenge
   - Visual: Difficulty bar, effort gauge

### Usage Ideas

```typescript
// Frontend can use these for visual elements:
{
  likelihood: 75,      // → "75% Favorable" with green progress bar
  timingClarity: 85,   // → "High Clarity" with star rating
  challengeLevel: 60   // → "Moderate Effort" with difficulty indicator
}
```

These metrics:
- ✅ Add gamification/entertainment value
- ✅ Give quick visual summary before reading
- ✅ Are grounded in actual chart analysis (not random)
- ✅ Work across all question categories

## Prompt Engineering Strategy

### System Prompt Structure

The system prompt guides the LLM to:
1. **Use tools effectively** - Check chart data before answering
2. **Write engagingly** - Conversational tone, no jargon
3. **Be specific** - Use actual years, ages, and timeframes
4. **Provide structure** - 4-section response format
5. **Generate metrics** - Likelihood, timing clarity, challenge level

### Response Format

Every answer follows this structure:

1. **Opening Hook** (2-3 sentences)
   - Immediately resonates with their question
   - References specific chart insight

2. **Key Insights** (3-5 points)
   - Specific to their chart
   - Includes actual years/ages/time periods
   - Connects patterns to real-life implications

3. **Timing & Recommendations**
   - Concrete time windows
   - Explains WHY based on chart
   - 2-3 actionable recommendations

4. **Closing Encouragement** (2-3 sentences)
   - Empowers user agency
   - Leaves them informed and optimistic

## Tool Usage Pattern

The LLM typically follows this pattern:

1. **Start broad** - `getBasicAnalysis()` to understand the natal chart
2. **Look ahead** - `getYearPillars([2027, 2028, 2029, ...])` for relevant timeframes
3. **Check current cycle** - `getLuckPillarAtAge(37)` for 10-year cycle context
4. **Examine specific years** - `getYearInteractions(2028)` for detailed analysis

## Mock Questions (Current)

```typescript
const MOCK_QUESTIONS = [
  {
    id: 'wealth',
    title: 'When will I get rich?',
    category: 'wealth',
    isPremium: true,
  },
  {
    id: 'marriage',
    title: 'When will I get married?',
    category: 'relationships',
    isPremium: true,
  },
  {
    id: 'career',
    title: 'When will I get promoted?',
    category: 'career',
    isPremium: true,
  },
  {
    id: 'success',
    title: 'Will I be successful?',
    category: 'life',
    isPremium: true,
  },
];
```

## Future Enhancements

### Database Integration
- Move questions to `Question` model in DB
- Add fields: `ageRange`, `category`, `isPremium`
- Support dynamic question creation

### Response Structure Refinement
- Consider per-category templates
- Add visualization data (e.g., timeline charts)
- Include confidence scores

### Caching
- Cache answers per user + question combination
- Similar to personal reports
- Update when chart changes (e.g., new year, luck pillar shift)

### Premium Features
- Free: Basic questions (1-2 per month)
- Premium: Unlimited questions + follow-up queries
- Custom questions via chat interface

## Testing

To test the endpoint:

```bash
# 1. Get your auth token
POST /auth/authenticate
{
  "token": "your-oauth-token",
  "provider": "google"
}

# 2. Answer a question
POST /questions/wealth/answer
Authorization: Bearer <your-token>
{
  "questionId": "wealth",
  "birthDate": "1988-06-11T19:00:00",
  "gender": "male",
  "birthTimezone": "Asia/Seoul",
  "isTimeKnown": true
}
```

## Design Decisions

### Why Subject-Agnostic Tools?

Instead of creating question-specific tools (e.g., "analyze wealth potential"), we built generic data extraction tools. This allows:
- ✅ Reusability across all question types
- ✅ LLM flexibility in interpretation
- ✅ Reduced maintenance (4 tools vs. dozens)
- ✅ Better hallucination prevention (facts only)

### Why Gemini 2.0 Flash?

- Fast generation speed for good UX
- Strong tool-calling capabilities
- Cost-effective for premium feature
- Can switch to other models easily (abstracted)

### Why Not Pre-generate?

Pre-generating all Q&A combinations would:
- ❌ Be inflexible (can't adjust to user context)
- ❌ Miss nuances in user's current situation
- ❌ Not support follow-up questions
- ✅ Current approach: Generate on-demand for premium users

## Key Challenges

1. **Prompt Engineering** - Finding the right balance between:
   - Technical accuracy (using chart data correctly)
   - Accessibility (no jargon, engaging tone)
   - Specificity (concrete years/ages)

2. **Response Structure** - Deciding between:
   - Generic format (works for all questions)
   - Category-specific templates (more tailored)
   - Current: Start generic, refine based on user feedback

3. **Quality Control** - Ensuring:
   - LLM uses tools correctly
   - Answers are grounded in chart data
   - No hallucination or vague mysticism
   - Future: Add validation layer or confidence scores

