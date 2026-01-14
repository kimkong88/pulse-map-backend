/**
 * LLM Prompts for Chapter Report Generation
 *
 * Tone: Simple, warm, encouraging (10-year-old reading level)
 * NO Bazi jargon in user-facing text
 * Consistent metaphors: seasons, growth, journeys, weather
 */

// ============================================================================
// SHARED SYSTEM MESSAGE (Ensures Consistency Across All 6 Prompts)
// ============================================================================

export const CHAPTER_SYSTEM_MESSAGE = `You are a warm, encouraging life guide helping someone understand their life journey through Bazi (Chinese astrology).

Your job is to explain Bazi concepts in clear language that a 10-year-old could understand, while maintaining authenticity.

Writing Guidelines:
1. Use simple, everyday words (grade 4-5 vocabulary)
2. Keep sentences short (10-15 words)
3. Use familiar metaphors (seasons, weather, growth, journeys)
4. Be warm and encouraging (never scary or negative)
5. Speak directly to the reader ("You will..." "Your...")
6. Make it feel like a story, not a report

Technical Basis Guidelines:
1. **ALWAYS use CHINESE CHARACTERS (正印, 正官, 日主), NEVER Pinyin (Zheng Yin, Zheng Guan)**
2. EXPLAIN the actual Bazi mechanics (element cycles, Ten God roles)
3. Show WHY things happen (causal explanations, not just metaphors)
4. Format: "Resource energy (正印)" or "Day Master (日主)"
5. Teach the real logic: "WATER produces METAL, therefore..."

Tone: Warm, clear, hopeful, like a wise friend explaining things simply with authentic knowledge.`;

// ============================================================================
// HELPER: Build Simple Context (No Bazi Jargon)
// ============================================================================

export interface SimpleChapterContext {
  ageRange: string; // "Ages 0-19"
  overallScore: number;
  opportunities: number;
  challenges: number;
  topCategories: string[]; // ["Career", "Personal Growth"]
  mainElement: string; // "METAL" (simplified, no Chinese)
  favorableElements: string[]; // ["WATER", "EARTH"]
  dominantVibe: 'growth' | 'challenge' | 'balance' | 'change';
  keyYears?: number[]; // Significant years with high scores

  // 🔧 RICH BAZI CONTEXT (For Technical Basis)
  baziDetails: {
    dayMaster: {
      element: string; // "METAL"
      yinYang: string; // "Yang"
      chineseName: string; // "庚金"
    };
    natalPillars: {
      year: { tenGod: string | null; element: string }; // "正官 Officer", "WOOD"
      month: { tenGod: string | null; element: string };
      day: { tenGod: string | null; element: string };
      hour: { tenGod: string | null; element: string };
    };
    luckEraTransitions?: Array<{
      age: number;
      tenGod: string | null; // "傷官 Wounded Officer"
      element: string; // "WATER"
      isPreLuckEra: boolean;
    }>;
    topCategoryTenGods: {
      [category: string]: string | null; // "Career": "正官 Direct Officer"
    };
    keyInteractions?: string[]; // ["Year-Month Stem Harmony", "Day-Hour Branch Clash"]
  };
}

// NOTE: Context is now built inline in saju.service.ts with rich Bazi details
// This interface defines the structure that must be passed to all prompt functions

// ============================================================================
// PROMPT 1: Title & Subtitle
// ============================================================================

export function generateTitlePrompt(context: SimpleChapterContext): string {
  return `${CHAPTER_SYSTEM_MESSAGE}

Your task: Create a poetic title and subtitle for this life chapter.

Context:
- Age Range: ${context.ageRange}
- Overall Vibe: ${context.dominantVibe === 'growth' ? 'Growing and learning' : context.dominantVibe === 'challenge' ? 'Building strength' : context.dominantVibe === 'balance' ? 'Finding balance' : 'Times of change'}
- Main Focus: ${context.topCategories.join(' and ')}
- Score: ${context.overallScore}/100

Requirements:
1. Title: 3-6 words max, poetic and evocative
   - Use metaphors: seasons, journeys, growth, building
   - Examples: "The Growing Years", "Finding Your Way", "Building Strong Roots"
   
2. Subtitle: 8-12 words, explains what the title means
   - Simple, clear, warm
   - Examples: "A time for learning and planting seeds for your future"

Make it feel hopeful and meaningful, not scary or overwhelming.

**CRITICAL: Return ONLY valid JSON in this EXACT format:**

{
  "title": "The Growing Years",
  "subtitle": "A time for learning and growing your first real skills"
}

**LIMITS:**
- title: 3-50 characters
- subtitle: 10-100 characters
- MUST be valid JSON, no extra text`;
}

// ============================================================================
// PROMPT 2: Introduction
// ============================================================================

export function generateIntroductionPrompt(
  context: SimpleChapterContext,
): string {
  return `${CHAPTER_SYSTEM_MESSAGE}

Your task: Write a warm, welcoming introduction to this life chapter.

Context:
- Age Range: ${context.ageRange}
- Overall Score: ${context.overallScore}/100 (Opportunities: ${context.opportunities}, Challenges: ${context.challenges})
- Main Focus: ${context.topCategories.join(' and ')}
- Vibe: ${context.dominantVibe}

Requirements:
1. Write 3-5 short paragraphs (2-4 sentences each, **MAX 1200 characters total**)
2. First paragraph: Welcome them to this chapter, set the tone
3. Middle paragraphs: Explain what this time is about (using simple metaphors)
4. Last paragraph: What they'll discover or learn

Use these metaphors:
- Seasons (spring = new beginnings, summer = energy, fall = harvest)
- Growth (planting, roots, blooming)
- Journeys (paths, roads, destinations)
- Building (foundation, blocks, creating)

Keep it warm and encouraging. No Bazi terms!

**CRITICAL: Return ONLY valid JSON in this EXACT format:**

{
  "text": "Think of this time like the first day of spring. Everything feels fresh and new. You're just starting to figure out who you are and what you like.\n\nIt's okay if you don't have all the answers yet – this is the time for exploring and trying new things. Like planting seeds in a garden, what you do now will grow into something beautiful later.\n\nThis chapter is about learning, growing, and discovering what makes you special. Every day brings new chances to try something different."
}

**LIMITS:**
- text: 200-1200 characters ONLY
- 3-5 short paragraphs
- MUST be valid JSON, no extra text`;
}

// ============================================================================
// PROMPT 3: Vibe Check
// ============================================================================

export function generateVibeCheckPrompt(context: SimpleChapterContext): string {
  // Format Luck Era transitions for prompt
  const luckEraInfo =
    context.baziDetails.luckEraTransitions
      ?.map(
        (trans) =>
          `Age ${trans.age}: ${trans.isPreLuckEra ? 'Pre-Luck Era (no 大運 yet)' : `${trans.tenGod} (${trans.element})`}`,
      )
      .join('\n  ') || 'No transitions in this period';

  // Format top category Ten Gods
  const categoryTenGods = Object.entries(context.baziDetails.topCategoryTenGods)
    .map(([category, tenGod]) => `${category}: ${tenGod || 'N/A'}`)
    .join(', ');

  return `${CHAPTER_SYSTEM_MESSAGE}

Your task: Create 3-5 "vibe labels" that describe the feeling of this chapter.

**BAZI CONTEXT (MUST USE IN TECHNICAL BASIS):**
- Day Master (日主): ${context.baziDetails.dayMaster.chineseName} (${context.baziDetails.dayMaster.yinYang} ${context.baziDetails.dayMaster.element})
- Favorable Elements (用神): ${context.favorableElements.join(', ') || 'None specified'}
  ℹ️ Based on chart balance (用神 Yong Shen), NOT simple element production
- Natal Pillars (Ten Gods):
  Year (Social): ${context.baziDetails.natalPillars.year.tenGod || 'N/A'}
  Month (Career): ${context.baziDetails.natalPillars.month.tenGod || 'N/A'}
  Day (Personal): ${context.baziDetails.natalPillars.day.tenGod || 'N/A'}
  Hour (Innovation): ${context.baziDetails.natalPillars.hour.tenGod || 'N/A'}
- Luck Era Transitions (大運):
  ${luckEraInfo}
- Top Category Ten Gods: ${categoryTenGods}
- Focus Life Areas: ${context.topCategories.join(', ')}
- Age Range: ${context.ageRange}
- Fortune Score: ${context.overallScore}/100 (${context.dominantVibe} period)

Requirements:
1. Introduction (1-2 paragraphs, **MAX 400 characters**): Explain what "vibes" means in simple terms

2. Create 3-5 vibes, each with:
   - Label: 2-4 words (MAX 30 chars), creative and evocative (e.g., "The Planting Season")
   - Description: 2-3 sentences (50-250 chars) explaining this vibe in SIMPLE words
   - **technicalBasis: EXPLAIN the actual Bazi logic (element production cycles, Ten God relationships). Use CHINESE CHARACTERS (正印, 正官, 日主), NOT Pinyin. Explain WHY it works. Example: "Your chart shows Resource energy (正印). In Bazi, EARTH produces METAL - like soil nourishing metal ore. Since you're a ${context.mainElement} person (日主/Day Master), EARTH energy around you means you naturally receive learning and support. This is WHY mentors are crucial now." Focus on causal explanations, not just metaphors.**
   - Connect actual Bazi mechanics to real-world outcomes
   - Must reference Day Master, element cycles, or Ten God influences

Metaphor Categories:
- Nature: seasons, weather, growth, gardens
- Journeys: paths, roads, doors, horizons
- Building: foundations, tools, crafting
- Light: sunny, shadows, dawn, dusk

**CRITICAL: Return ONLY valid JSON in this EXACT format (MUST include ALL fields):**

{
  "introduction": "These vibes are like weather forecasts for your life chapter. They show the different feelings and energies you'll experience during this time.",
  "vibes": [
    {
      "label": "Metal's Flowing Path",
      "description": "Like a metal tool being shaped by water, this time helps you become stronger and sharper. You're learning what you're naturally good at.",
      "technicalBasis": "You're a ${context.mainElement} person (日主/Day Master). In Bazi, ${context.favorableElements[0] || 'WATER'} produces ${context.mainElement} through the production cycle. This means ${context.favorableElements[0] || 'WATER'} energy nourishes your core nature, like water shaping and strengthening metal. This is WHY you naturally thrive in ${context.topCategories[0] || 'learning'} environments during this period.",
      "affectedYears": [${context.ageRange.match(/\d+/)?.[0] || 0}, ${parseInt(context.ageRange.match(/\d+/)?.[0] || '0') + 5}]
    },
    {
      "label": "Building Your Foundation",
      "description": "You're laying the groundwork for your future. Like building a house, you start with strong basics that will support everything else.",
      "technicalBasis": "Your chart shows strong Resource energy (正印) in your ${context.topCategories[1] || 'growth'} pillar. In Bazi, Resource represents learning and support. Since you're ${context.mainElement} (日主), this Resource energy produces your core nature through the five-element cycle, providing a stable foundation for development."
    }
  ]
}

**TECHNICAL BASIS REQUIREMENTS:**
1. Use CHINESE CHARACTERS (正印, 正官, 日主), NOT Pinyin
2. EXPLAIN the actual Bazi mechanics (production cycle, control cycle, Ten God relationships)
3. Show WHY causally: "WATER produces METAL, therefore..." not just "like water helping metal"
4. Must reference: Day Master/日主 (${context.mainElement}), element cycles, or Ten God influences
5. Format: "Resource energy (正印)" or "日主/Day Master"
6. Connect mechanics to real outcomes: "This is WHY you feel/experience..."
7. Example structure: "[Term (漢字)] + [Elemental logic] + [Causal link] + [Real outcome]"
8. Be explanatory but authentic - teach the actual Bazi logic

**MANDATORY FIELDS FOR EACH VIBE:**
- label (string)
- description (string)
- technicalBasis (string)
- affectedYears (array of numbers, OPTIONAL)

**LIMITS:**
- introduction: 100-400 characters
- label: 5-30 characters
- description: 50-250 characters
- technicalBasis: 20-180 characters
- 3-5 vibes total
- MUST be valid JSON, no extra text`;
}

// ============================================================================
// PROMPT 4: Turning Points
// ============================================================================

export function generateTurningPointsPrompt(
  context: SimpleChapterContext,
  turningPointData: any[],
): string {
  const eventsContext = turningPointData
    .map(
      (tp) =>
        `Year ${tp.year} (Age ${tp.age}): Score ${tp.score}, Categories: ${tp.categories.join(', ')}`,
    )
    .join('\n');

  // Format Luck Era transitions for prompt
  const luckEraInfo =
    context.baziDetails.luckEraTransitions
      ?.map(
        (trans) =>
          `Age ${trans.age}: ${trans.isPreLuckEra ? 'Pre-Luck Era (no 大運 yet)' : `${trans.tenGod} (${trans.element})`}`,
      )
      .join('\n  ') || 'No transitions in this period';

  // Format top category Ten Gods
  const categoryTenGods = Object.entries(context.baziDetails.topCategoryTenGods)
    .map(([category, tenGod]) => `${category}: ${tenGod || 'N/A'}`)
    .join(', ');

  return `${CHAPTER_SYSTEM_MESSAGE}

Your task: Explain the major turning points in this chapter.

**BAZI CONTEXT (MUST USE IN TECHNICAL BASIS):**
- Day Master (日主): ${context.baziDetails.dayMaster.chineseName} (${context.baziDetails.dayMaster.yinYang} ${context.baziDetails.dayMaster.element})
- Favorable Elements (用神): ${context.favorableElements.join(', ') || 'None specified'}
  ℹ️ Based on chart balance (用神 Yong Shen), NOT simple element production
- Natal Pillars (Ten Gods):
  Year (Social): ${context.baziDetails.natalPillars.year.tenGod || 'N/A'}
  Month (Career): ${context.baziDetails.natalPillars.month.tenGod || 'N/A'}
  Day (Personal): ${context.baziDetails.natalPillars.day.tenGod || 'N/A'}
  Hour (Innovation): ${context.baziDetails.natalPillars.hour.tenGod || 'N/A'}
- Luck Era Transitions (大運):
  ${luckEraInfo}
- Top Category Ten Gods: ${categoryTenGods}
- Key Interactions: ${context.baziDetails.keyInteractions?.join(', ') || 'Various interactions'}
- Focus Life Areas: ${context.topCategories.join(', ')}
- Age Range: ${context.ageRange}

**KEY TURNING POINT DATA:**
${eventsContext}

Requirements:
1. Introduction (1-2 paragraphs, **MAX 400 characters**): Explain what "turning points" means
   - Use simple words: "important moments", "big changes", "key times"

2. For EACH turning point year listed above, create:
   - Label: 3-5 words (MAX 35 chars) describing this moment
   - Description: 2-3 sentences (50-250 chars) explaining what happens in SIMPLE words
   - **technicalBasis: EXPLAIN the actual Bazi mechanics. Use CHINESE CHARACTERS (正官, 七殺, 大運), NOT Pinyin. Explain the elemental logic or Ten God influence. Example: "At age X, you enter a new 10-year Luck Pillar (大運) with Authority energy (正官). In Bazi, 正官 represents structure and guidance. For a ${context.mainElement} person (日主), this Authority energy provides clear direction through the control cycle. This is WHY structure and rules suddenly feel more helpful during this period." Focus on WHY the change happens.**
   - Example outcomes: 2-3 simple examples (each under 60 chars)
   - Categories: Use the categories from the data above
   - Significance: Based on the score (>75 = major, 50-75 = moderate, <50 = minor)

Keep it clear and specific. Use familiar metaphors.

**CRITICAL: Return ONLY valid JSON in this EXACT format:**

{
  "introduction": "Turning points are like milestones on your journey. They're moments when something important shifts and life feels a little different than before.",
  "events": [
    {
      "year": 2005,
      "age": 15,
      "label": "First Big Growth Spurt",
      "description": "Things start clicking into place. Skills you practiced suddenly feel easier. Your brain and body figured out how to work together.",
      "technicalBasis": "At this age, you enter a new Luck Pillar (大運) with ${context.favorableElements[0] || 'WATER'} energy. In Bazi, ${context.favorableElements[0] || 'WATER'} produces ${context.mainElement} through the five-element production cycle. Since you're a ${context.mainElement} person (日主/Day Master), this ${context.favorableElements[0] || 'WATER'} phase directly nourishes your core nature. This is WHY your natural ${context.topCategories[0] || 'Career'} talents suddenly accelerate during this period.",
      "exampleOutcomes": [
        "Master that skill you've been working on",
        "Friends ask you for help with things",
        "Feel more confident trying new activities"
      ],
      "categories": ["career", "personalGrowth"],
      "significance": "major"
    }
  ]
}

**MANDATORY FIELDS FOR EACH EVENT:**
- year (number)
- age (number)
- label (string, 5-35 chars)
- description (string, 50-250 chars)
- technicalBasis (string, 20-200 chars, Bazi terms OK)
- exampleOutcomes (array of 2-3 strings, each under 60 chars)
- categories (array of strings: career, wealth, relationships, wellness, personalGrowth)
- significance (string: "major", "moderate", or "minor")

**TECHNICAL BASIS REQUIREMENTS:**
1. Use CHINESE CHARACTERS (大運, 正官, 七殺, 正印), NOT Pinyin
2. EXPLAIN the actual Bazi mechanics (element production/control, Ten God roles)
3. Show WHY causally: "正官 controls ${context.mainElement}, therefore..." 
4. Must reference: Day Master/日主 (${context.mainElement}), Luck Pillar (大運) changes, Ten God interactions, or element cycle shifts
5. Format: "Authority energy (正官)" or "Luck Pillar (大運)"
6. Connect mechanics to outcomes: "This is WHY [specific change] happens"
7. Example: "You enter a 大運 with 正官 energy. For ${context.mainElement} (日主), 正官 represents structure through the control cycle. This is WHY rules suddenly feel helpful."
8. Be explanatory and authentic - teach real Bazi logic, not just metaphors

**LIMITS:**
- introduction: 100-400 characters
- MUST include ALL 8 fields for EVERY event
- MUST be valid JSON, no extra text`;
}

// ============================================================================
// PROMPT 5: Cheat Sheet (Do's and Don'ts)
// ============================================================================

export function generateCheatSheetPrompt(
  context: SimpleChapterContext,
): string {
  return `${CHAPTER_SYSTEM_MESSAGE}

Your task: Create a simple "cheat sheet" with helpful do's and don'ts.

Context:
- Age Range: ${context.ageRange}
- Strengths: ${context.opportunities > 60 ? 'High opportunities for growth' : 'Building resilience'}
- Focus: ${context.topCategories.join(' and ')}

Requirements:
1. Introduction (1-2 paragraphs, **MAX 400 characters**): Explain what this cheat sheet is for
   - Make it feel like friendly advice
   - Keep it short and sweet!

2. Create two lists:
   - **Encouraged Actions** (3-5 items): Things that will work well
   - **Things to Avoid** (3-5 items): Things that might be harder

Each item should be:
- One short sentence (8-12 words max)
- Specific and actionable
- For "avoidActions": State what NOT to do directly (e.g., "Rushing big decisions" NOT "Don't rush")
- Simple words only

**CRITICAL: Return ONLY valid JSON in this EXACT format:**

{
  "introduction": "This cheat sheet is like a helpful guide for your early years. It shows you what works well and what to watch out for, so you can make the most of this special time.",
  "encouragedActions": [
    "Try new hobbies and explore different interests",
    "Build good habits early – they stick with you",
    "Ask questions and learn from people around you"
  ],
  "avoidActions": [
    "Worrying if you don't have everything figured out",
    "Rushing big decisions before you're ready",
    "Comparing your journey to other people's paths"
  ]
}

**WORDING RULES FOR "avoidActions":**
- BAD: "Don't worry about X" (double negative - confusing!)
- GOOD: "Worrying about X" (clear - this is what to avoid)
- BAD: "Avoid rushing X" (redundant - already in "avoidActions")
- GOOD: "Rushing X" (clear and direct)

**IMPORTANT:**
- introduction: 100-400 characters ONLY
- Each action: One short sentence (under 60 characters)
- 3-5 items in each array
- MUST be valid JSON, no extra text`;
}

// ============================================================================
// PROMPT 6: Takeaways
// ============================================================================

export function generateTakeawaysPrompt(context: SimpleChapterContext): string {
  return `${CHAPTER_SYSTEM_MESSAGE}

Your task: Write a warm, encouraging conclusion to wrap up this chapter.

Context:
- Age Range: ${context.ageRange}
- Overall Score: ${context.overallScore}/100
- Main Theme: ${context.topCategories.join(' and ')}
- Vibe: ${context.dominantVibe}

Requirements:
1. Write 3-5 short paragraphs (2-4 sentences each, **MAX 1200 characters total**)
2. First paragraph: Summarize the main feeling of this chapter
3. Middle paragraphs: Key lessons or insights
4. Last paragraph: Leave them feeling hopeful about what they're building

Use metaphors that tie back to the whole chapter (seasons, growth, journey).

Keep it warm, clear, and encouraging. End on a positive note!

**CRITICAL: Return ONLY valid JSON in this EXACT format:**

{
  "text": "These early years are like planting a garden. You're putting seeds in the ground, watering them, and waiting to see what grows.\n\nSome plants will shoot up fast, others take their time. That's okay – you're building something that will bloom for years to come. Every lesson you learn now becomes a tool you'll use later.\n\nRemember, this chapter isn't about having everything figured out. It's about exploring, learning, and discovering what makes you special. Trust the process and enjoy the journey."
}

**LIMITS:**
- text: 200-1200 characters ONLY
- 3-5 short paragraphs
- MUST be valid JSON, no extra text`;
}

// ============================================================================
// USAGE EXAMPLE
// ============================================================================

/*
// In saju.service.ts or chapterReport.service.ts:

import { 
  buildSimpleContext, 
  generateTitlePrompt,
  generateIntroductionPrompt,
  // ... other prompts
} from './prompts/chapterReport.prompts';

async function generateChapterReportUI(
  fortuneReport: FortuneReport,
  ageStart: number
): Promise<ChapterReportUI> {
  
  // 1. Build simple context (no Bazi jargon)
  const context = buildSimpleContext(fortuneReport, ageStart);
  
  // 2. Generate all 6 sections in parallel
  const [titleResult, introResult, vibesResult, turningPointsResult, cheatSheetResult, takeawaysResult] = 
    await Promise.all([
      generateWithAI(generateTitlePrompt(context)),
      generateWithAI(generateIntroductionPrompt(context)),
      generateWithAI(generateVibeCheckPrompt(context)),
      generateWithAI(generateTurningPointsPrompt(context, turningPointData)),
      generateWithAI(generateCheatSheetPrompt(context)),
      generateWithAI(generateTakeawaysPrompt(context)),
    ]);
  
  // 3. Combine into ChapterReportUI
  return {
    _source: { fortuneReport, llmPromptContext, ... },
    title: titleResult.title,
    subtitle: titleResult.subtitle,
    introduction: introResult,
    vibeCheck: vibesResult,
    turningPoints: turningPointsResult,
    cheatSheet: cheatSheetResult,
    takeaways: takeawaysResult,
  };
}
*/
