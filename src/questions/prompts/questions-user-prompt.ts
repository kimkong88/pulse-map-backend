import { UserContext, RawBaziData } from '../../saju/types';
import { PersonalizedDailyAnalysisOutput } from '@aharris02/bazi-calculator-by-alvamind';

interface Demographics {
  age: number;
  ageRange: string; // e.g., "30-40"
  gender: 'male' | 'female';
  birthLocation: string;
  currentLocation: string;
}

/**
 * Build prompt for "me" scope (natal chart only - fewer tokens, faster)
 */
export function buildMeQuestionsPrompt(data: {
  demographics: Demographics;
  userContext: UserContext;
}): string {
  const { demographics, userContext } = data;

  // Format Day Master
  const dayMaster = userContext.natalStructure.personal;
  const dayMasterElement = `${dayMaster.element}-${dayMaster.yinYang === 'Yin' ? 'I' : 'O'}`;

  // Format favorable elements
  const favorableElements = userContext.favorableElements
    ? [
        ...(userContext.favorableElements.primary || []),
        ...(userContext.favorableElements.secondary || []),
        ...(userContext.favorableElements.unfavorable || []),
      ].join(', ')
    : 'none';

  // Format special stars
  const specialStars: string[] = [];
  if (userContext.specialStars) {
    if (userContext.specialStars.nobleman && userContext.specialStars.nobleman.length > 0) {
      specialStars.push(`Nobleman (${userContext.specialStars.nobleman.length} branch${userContext.specialStars.nobleman.length > 1 ? 'es' : ''})`);
    }
    if (userContext.specialStars.intelligence) {
      specialStars.push('Intelligence');
    }
    if (userContext.specialStars.skyHorse) {
      specialStars.push('Sky Horse');
    }
    if (userContext.specialStars.peachBlossom) {
      specialStars.push('Peach Blossom');
    }
  }
  const specialStarsText = specialStars.length > 0 ? specialStars.join(', ') : 'none';

  // Format Ten Gods
  const tenGods: string[] = [];
  if (userContext.natalStructure.social.tenGod) {
    tenGods.push(`Year: ${userContext.natalStructure.social.tenGod}`);
  }
  if (userContext.natalStructure.career.tenGod) {
    tenGods.push(`Month: ${userContext.natalStructure.career.tenGod}`);
  }
  if (userContext.natalStructure.innovation?.tenGod) {
    tenGods.push(`Hour: ${userContext.natalStructure.innovation.tenGod}`);
  }
  const tenGodsText = tenGods.length > 0 ? tenGods.join(', ') : 'none';

  // Format natal patterns
  const natalPatternsText =
    userContext.natalPatterns && userContext.natalPatterns.length > 0
      ? userContext.natalPatterns.map((p) => p.name).join(', ')
      : 'none';

  return `Generate personalized questions for this user (NATAL CHART ONLY):

DEMOGRAPHIC PROFILE:
- Age: ${demographics.age} (Age Range: ${demographics.ageRange})
- Gender: ${demographics.gender}
- Birth Location: ${demographics.birthLocation} (for context only - DO NOT mention)
- Current Location: ${demographics.currentLocation} (for context only - DO NOT mention)

NATAL CHART DATA:
- Day Master: ${dayMasterElement}
- Chart Strength: ${userContext.chartStrength?.strength || 'Unknown'}
- Favorable Elements: ${favorableElements}
- Special Stars: ${specialStarsText}
- Ten Gods: ${tenGodsText}
- Natal Patterns: ${natalPatternsText}

SCOPE: Natal chart insights only (personality, strengths, life themes, special stars)

CRITICAL: Use their SPECIFIC chart data to create HIGHLY PERSONAL questions about REAL problems:

For 20s females - Focus on:
- Relationships: Dating wrong people, friends leaving, feeling alone, getting hurt, attracting toxic people
- Money: Struggling financially, losing money, bad with money
- Life: Feeling stuck, behind, failing, lost, directionless
- Social: Being used, walked over, misunderstood, excluded

For 30s - Focus on:
- Stability: Relationship issues, career stagnation, financial pressure
- Family: Conflicts, pressure, expectations
- Fulfillment: Feeling unfulfilled, missing something, regrets

Chart-specific mapping:
- Peach Blossom star → "Why do I attract toxic people?" / "Why do I keep dating wrong guys?"
- Direct Wealth / Indirect Wealth → "Why do I keep losing money?" / "Why am I always broke?"
- Hurting Officer → "Why do I always get hurt?" / "Why do people walk all over me?"
- Nobleman star → "Why do people use me?" / "Why do I keep helping people who don't help me?"
- Conflicting elements → "Why do I feel stuck?" / "Why can't I move forward?"
- Missing elements → "Why do I feel empty?" / "What's missing in my life?"

AVOID abstract/philosophical questions. Focus on CONCRETE problems they actually experience.

Generate 5-7 questions that:
1. Are HIGHLY PERSONAL - feel like they were written specifically for THIS person based on THEIR chart
2. Are DIRECT - hit pain points hard, no generic self-help questions
3. Are PROVOCATIVE - make them think "I NEED to know this!" or "How did they know?"
4. Reference SPECIFIC chart features (special stars, Ten Gods, patterns) to create targeted questions
5. Are age-appropriate and hit life-stage-specific concerns (${demographics.ageRange}, ${demographics.gender})
6. Can be answered with the natal chart data available
7. Address REAL problems (self-sabotage, toxic patterns, relationship issues, career blocks, money problems)

Output as JSON array:
[
  {
    "title": "Question title here",
    "description": "What they'll find out here"
  },
  ...
]`;
}

/**
 * Build prompt for "daily" scope (natal + daily chart - more tokens but needed for daily questions)
 */
export function buildDailyQuestionsPrompt(data: {
  demographics: Demographics;
  userContext: UserContext;
  dailyData: {
    dailyRawData: RawBaziData;
    dailyAnalysis: PersonalizedDailyAnalysisOutput;
  };
}): string {
  const { demographics, userContext, dailyData } = data;

  // Format Day Master
  const dayMaster = userContext.natalStructure.personal;
  const dayMasterElement = `${dayMaster.element}-${dayMaster.yinYang === 'Yin' ? 'I' : 'O'}`;

  // Format favorable elements
  const favorableElements = userContext.favorableElements
    ? [
        ...(userContext.favorableElements.primary || []),
        ...(userContext.favorableElements.secondary || []),
        ...(userContext.favorableElements.unfavorable || []),
      ].join(', ')
    : 'none';

  // Format special stars
  const specialStars: string[] = [];
  if (userContext.specialStars) {
    if (userContext.specialStars.nobleman && userContext.specialStars.nobleman.length > 0) {
      specialStars.push(`Nobleman (${userContext.specialStars.nobleman.length} branch${userContext.specialStars.nobleman.length > 1 ? 'es' : ''})`);
    }
    if (userContext.specialStars.intelligence) {
      specialStars.push('Intelligence');
    }
    if (userContext.specialStars.skyHorse) {
      specialStars.push('Sky Horse');
    }
    if (userContext.specialStars.peachBlossom) {
      specialStars.push('Peach Blossom');
    }
  }
  const specialStarsText = specialStars.length > 0 ? specialStars.join(', ') : 'none';

  // Format Ten Gods
  const tenGods: string[] = [];
  if (userContext.natalStructure.social.tenGod) {
    tenGods.push(`Year: ${userContext.natalStructure.social.tenGod}`);
  }
  if (userContext.natalStructure.career.tenGod) {
    tenGods.push(`Month: ${userContext.natalStructure.career.tenGod}`);
  }
  if (userContext.natalStructure.innovation?.tenGod) {
    tenGods.push(`Hour: ${userContext.natalStructure.innovation.tenGod}`);
  }
  const tenGodsText = tenGods.length > 0 ? tenGods.join(', ') : 'none';

  // Format natal patterns
  const natalPatternsText =
    userContext.natalPatterns && userContext.natalPatterns.length > 0
      ? userContext.natalPatterns.map((p) => p.name).join(', ')
      : 'none';

  // Format daily element
  const dailyElement = dailyData.dailyRawData.dailyElement;
  const dailyYinYang = dailyData.dailyAnalysis.dayPillar?.stemYinYang || 'Yang';
  const dailyElementFormatted = `${dailyElement}-${dailyYinYang === 'Yin' ? 'I' : 'O'}`;

  // Format daily branch
  const dailyBranchChar = dailyData.dailyAnalysis.dayPillar?.branchChar || 'Unknown';
  const branchAnimals: Record<string, string> = {
    '子': 'Rat',
    '丑': 'Ox',
    '寅': 'Tiger',
    '卯': 'Rabbit',
    '辰': 'Dragon',
    '巳': 'Snake',
    '午': 'Horse',
    '未': 'Goat',
    '申': 'Monkey',
    '酉': 'Rooster',
    '戌': 'Dog',
    '亥': 'Pig',
  };
  const dailyBranchAnimal = branchAnimals[dailyBranchChar] || 'Unknown';

  // Format element relationship
  const isFavorable =
    userContext.favorableElements &&
    (userContext.favorableElements.primary.includes(dailyElement) ||
      userContext.favorableElements.secondary.includes(dailyElement));
  const isUnfavorable =
    userContext.favorableElements &&
    userContext.favorableElements.unfavorable.includes(dailyElement);
  const elementRelationship = isFavorable
    ? 'favorable'
    : isUnfavorable
      ? 'unfavorable'
      : 'neutral';

  return `Generate personalized questions for this user (NATAL + DAILY CHART):

DEMOGRAPHIC PROFILE:
- Age: ${demographics.age} (Age Range: ${demographics.ageRange})
- Gender: ${demographics.gender}
- Birth Location: ${demographics.birthLocation} (for context only - DO NOT mention)
- Current Location: ${demographics.currentLocation} (for context only - DO NOT mention)

NATAL CHART DATA:
- Day Master: ${dayMasterElement}
- Chart Strength: ${userContext.chartStrength?.strength || 'Unknown'}
- Favorable Elements: ${favorableElements}
- Special Stars: ${specialStarsText}
- Ten Gods: ${tenGodsText}
- Natal Patterns: ${natalPatternsText}

DAILY CHART DATA (for the selected date):
- Daily Element: ${dailyElementFormatted}
- Daily Branch: ${dailyBranchChar} (${dailyBranchAnimal})
- Element Relationship: ${elementRelationship} (${dailyElementFormatted} vs ${dayMasterElement})
- Active Ten Gods: Available (natal + transit + luck era)
- Special Patterns: Available (if any active on this date)

SCOPE: Natal + daily energy insights (TIMING, OPPORTUNITIES, ACTIONABLE INSIGHTS)

CRITICAL FOR DAILY SCOPE:
- Questions MUST be answerable with the CURRENT date's BaZi data only (we don't have future dates)
- Questions MUST focus on WHAT: what to do, what to avoid, what opportunities exist, what's blocking
- Questions MUST focus on HOW: how to navigate, how to channel energy, how to leverage support
- DO NOT ask "when" questions - we only have data for the current date, not future dates
- Questions MUST reference the day's energy (element relationship: ${elementRelationship}, daily element: ${dailyElementFormatted}, active Ten Gods, special patterns)
- DO NOT mention "today" or specific dates - questions should work for any day
- Use phrases like "right now", "at this time", "currently", "this period" instead of "today"

Generate 5-7 questions that:
1. Ask WHAT: what to do, what to avoid, what opportunities exist, what's blocking
2. Ask HOW: how to navigate, how to channel energy, how to leverage support
3. Are OPPORTUNITY-FOCUSED: about what's available, what to pursue, what to watch for
4. Are ACTION-ORIENTED: about what actions to take or avoid based on current energy
5. Reference the day's energy (element relationship: ${elementRelationship}, daily element: ${dailyElementFormatted}, active Ten Gods, special patterns)
6. Can be answered with the BaZi data available for the current date (natal + daily chart for this date only)
7. Are interesting to someone with this profile (${demographics.ageRange}, ${demographics.gender})
8. Are age-appropriate and relatable

Output as JSON array:
[
  {
    "title": "Question title here",
    "description": "What they'll find out here"
  },
  ...
]`;
}
