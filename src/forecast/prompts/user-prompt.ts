import { RawBaziData, UserContext } from '../../saju/types';
import { PersonalizedDailyAnalysisOutput } from '@aharris02/bazi-calculator-by-alvamind';

interface TodayForecastPromptData {
  userContext: UserContext;
  dailyRawData: RawBaziData;
  dailyAnalysis: PersonalizedDailyAnalysisOutput;
  targetDate: Date;
  currentTimezone: string;
  // User demographic context for personalized reading
  userDemographics?: {
    age: number;
    gender: 'male' | 'female';
    birthLocation: string;
    currentLocation: string;
  };
}

// Map interaction types to plain English descriptions
const INTERACTION_DESCRIPTIONS: Record<string, string> = {
  Branch6Combo: 'harmonious partnership and mutual support',
  TrinityCombo: 'powerful alliance and unified strength',
  DirectionalCombo: 'seasonal alignment and environmental support',
  StemCombination: 'cooperative merging and transformation through unity',
  BranchClash: 'fundamental conflict and movement requiring change',
  StemClash: 'direct conflict and breakthrough through friction',
  BranchHarm: 'subtle friction and hidden obstacles',
  BranchDestruction: 'things falling apart or breaking down',
  BranchPunishment: 'self-inflicted challenges and internal tension',
};

function describeInteraction(interaction: any): string {
  const type = interaction.type || '';
  const description = INTERACTION_DESCRIPTIONS[type] || 'energy interaction';
  const participants = interaction.participants?.map((p: any) => {
    if (p.pillar === 'Year') return 'your ancestral roots';
    if (p.pillar === 'Month') return 'your career foundation';
    if (p.pillar === 'Day') return 'your core self';
    if (p.pillar === 'Hour') return 'your creative expression';
    return p.pillar;
  }).join(' and ') || 'unknown';
  
  return `${description} between ${participants}`;
}

export function buildUserPrompt(data: TodayForecastPromptData): string {
  const { userContext, dailyRawData, dailyAnalysis, targetDate, currentTimezone, userDemographics } = data;

  // Format date for display
  const dateStr = new Date(targetDate).toLocaleDateString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    timeZone: currentTimezone,
  });

  // Extract key information for the prompt
  const dayMaster = userContext.natalStructure.personal; // Day pillar = Day Master
  const dayMasterElement = `${dayMaster.element}-${dayMaster.yinYang === 'Yin' ? 'I' : 'O'}`;
  const chartStrength = userContext.chartStrength?.strength || 'Balanced';
  const favorableElements = userContext.favorableElements
    ? [
        ...(userContext.favorableElements.primary || []),
        ...(userContext.favorableElements.secondary || []),
      ]
        .map((e) => e)
        .join(', ')
    : 'None';

  // Daily element with Yin/Yang
  const dailyElement = dailyRawData.dailyElement;
  const dailyYinYang = dailyAnalysis.dayPillar?.stemYinYang;
  const dailyElementFormatted = dailyElement && dailyYinYang
    ? `${dailyElement}-${dailyYinYang === 'Yin' ? 'I' : 'O'}`
    : dailyElement
    ? `${dailyElement}`
    : 'Unknown';

  // Luck era
  const luckEra = dailyRawData.luckEra;
  const luckEraInfo = luckEra
    ? `Current Luck Era: ${luckEra.tenGod || 'N/A'} (${luckEra.stemElement || 'N/A'})`
    : 'Pre-Luck Era';

  // Special stars activated today
  const specialStars = userContext.specialStars;
  const activatedStars: string[] = [];
  if (dailyAnalysis.dayPillar?.branchChar) {
    const todayBranch = dailyAnalysis.dayPillar.branchChar;
    if (specialStars.nobleman?.includes(todayBranch)) {
      activatedStars.push('Nobleman');
    }
    if (specialStars.intelligence === todayBranch) {
      activatedStars.push('Intelligence');
    }
    if (specialStars.skyHorse === todayBranch) {
      activatedStars.push('Sky Horse');
    }
    if (specialStars.peachBlossom?.includes(todayBranch)) {
      activatedStars.push('Peach Blossom');
    }
  }

  // Key interactions - describe in plain English
  const interactions = dailyAnalysis.interactions || [];
  const significantInteractions = interactions
    .slice(0, 8)
    .map((int: any) => describeInteraction(int))
    .filter(Boolean);

  // Describe luck era in plain English
  let luckEraDescription = '';
  if (luckEra) {
    const tenGodMeaning = luckEra.tenGod
      ? `This period emphasizes ${luckEra.tenGod.toLowerCase()} energy`
      : '';
    const elementDesc = luckEra.stemElement
      ? `with dominant ${luckEra.stemElement} influence`
      : '';
    luckEraDescription = tenGodMeaning && elementDesc
      ? `${tenGodMeaning} ${elementDesc}`
      : luckEraInfo;
  } else {
    luckEraDescription = 'Pre-Luck Era - building foundational energy before major cycles begin';
  }

  // Describe special stars in plain English
  const specialStarsDescriptions: string[] = [];
  if (activatedStars.includes('Nobleman')) {
    specialStarsDescriptions.push('Nobleman star activated - expect helpful people and supportive connections');
  }
  if (activatedStars.includes('Intelligence')) {
    specialStarsDescriptions.push('Intelligence star activated - ideal for learning, communication, and mental clarity');
  }
  if (activatedStars.includes('Sky Horse')) {
    specialStarsDescriptions.push('Sky Horse star activated - movement, travel, or significant change is favored');
  }
  if (activatedStars.includes('Peach Blossom')) {
    specialStarsDescriptions.push('Peach Blossom star activated - relationships and social connections are highlighted');
  }

  // Describe element relationship
  const elementRelationship = dailyElement && userContext.favorableElements
    ? (userContext.favorableElements.primary.includes(dailyElement) ||
       userContext.favorableElements.secondary.includes(dailyElement))
      ? 'Today\'s element is favorable and supportive of your nature'
      : userContext.favorableElements.unfavorable.includes(dailyElement)
      ? 'Today\'s element is challenging and may feel controlling or restrictive'
      : 'Today\'s element is neutral in relation to your nature'
    : '';

  // Build user context section
  let userContextSection = `USER'S CORE NATURE:
- Core Element: ${dayMasterElement} (this is their fundamental nature)
- Natural Strength: ${chartStrength}
- Elements That Support Them: ${favorableElements}`;

  // Add demographic context if available
  if (userDemographics) {
    const ageGroup = userDemographics.age < 18 ? 'teenager' 
      : userDemographics.age < 25 ? 'young adult'
      : userDemographics.age < 35 ? 'adult'
      : userDemographics.age < 50 ? 'mid-career professional'
      : userDemographics.age < 65 ? 'experienced professional'
      : 'senior';
    
    userContextSection += `

USER CONTEXT (for personalized examples - DO NOT mention these details directly in output):
- Age: ${userDemographics.age} (${ageGroup}) - Use to inform age-appropriate examples, but NEVER mention specific age
- Gender: ${userDemographics.gender} - Use appropriate pronouns naturally, but don't assume interests
- Birth Location: ${userDemographics.birthLocation} - Use to inform cultural context, but NEVER mention specific location
- Current Location: ${userDemographics.currentLocation} - Use to inform examples and context, but NEVER mention specific city/country

CRITICAL: Use this demographic data to make examples relatable and age-appropriate, but NEVER directly reference:
- Specific cities, countries, or locations (e.g., "Vancouver", "New York", "Canada")
- Specific ages (e.g., "as a 35-year-old")
- Specific locations in phrases like "here in [city]" or "living in [country]"
Instead, use generic references informed by context: "your work environment", "your local community", "your professional life"`;
  }

  return `Generate today's forecast for ${dateStr}.

${userContextSection}

TODAY'S ENERGY:
- Dominant Element Today: ${dailyElementFormatted}
- Element Relationship: ${elementRelationship || 'Neutral'}
- Current Life Cycle: ${luckEraDescription}
- Special Energies Active: ${specialStarsDescriptions.length > 0 ? specialStarsDescriptions.join('; ') : 'None'}
- Key Energy Interactions: ${significantInteractions.length > 0 ? significantInteractions.join('; ') : 'No significant interactions'}

Based on this objective data, generate:
1. A simple, engaging reading (3-6 paragraphs as an array, under 400 words total)
   - CRITICAL: Return paragraphs as an array of strings, not a single text blob
   - Each paragraph should be 2-4 sentences
   - IMPORTANT: TODAY'S ENERGY is the primary driver, not their natal chart
     - If Element Relationship is "favorable" → emphasize opportunities and positive aspects
     - If Element Relationship is "challenging" → acknowledge challenges but also highlight any positive interactions
     - If Element Relationship is "neutral" → focus on interactions and special stars
   - Start with a hook based on TODAY'S ENERGY (daily element, interactions, special stars)
   - Focus on 2-3 main themes from TODAY'S ENERGY (don't let natal chart weaknesses dominate)
   - Balance the reading: even weak charts have good days, even strong charts have challenging days
   - Use "you" language and write conversationally (use contractions, vary sentence length)
   - Connect to real situations: "You might notice this in meetings..." or "When making decisions today..."
   - Never mention scores, ratings, or numerical interpretations
   - Never explain chart mechanics - focus on what they'll experience and what to do
   - Keep paragraphs short and punchy (2-4 sentences each)
   - Format: Return as array, e.g., ["First paragraph text...", "Second paragraph text...", "Third paragraph text..."]
   - Include technicalBasis array with 3-5 technical explanations (BaZi terms ARE allowed in technicalBasis)

2. A theme (title) that captures the essence - MUST start with "Day of" and be 2-3 words total (e.g., "Day of Focus", "Day of Momentum", "Day of Clarity")

3. A subheading that supports the theme (8-15 words)

4. 0-3 good things (only if the reading highlights positive aspects)
   - Concrete examples/opportunities that illustrate the reading
   - Include "howToMaximize" - specific advice on how to maximize this opportunity
   - Include technicalBasis array with 1-3 technical explanations (BaZi terms ARE allowed in technicalBasis)

5. 0-3 challenges (only if the reading highlights challenging aspects)
   - Concrete warnings/obstacles that illustrate the reading
   - Include technicalBasis array with 1-3 technical explanations (BaZi terms ARE allowed in technicalBasis)

CRITICAL RULES:
- Main text (reading.paragraphs, goodThings.description, challenges.description): Use ONLY plain English. Never use BaZi technical terms.
- Technical basis arrays: BaZi terms ARE allowed here. Be specific (e.g., "Branch6Combo between Year and Day pillars", "Daily Water element controls Fire-I Day Master").`;
}
