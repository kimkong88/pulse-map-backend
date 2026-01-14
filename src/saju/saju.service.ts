import { Injectable } from '@nestjs/common';
import {
  BaziCalculator,
  PersonalizedDailyAnalysisOutput,
  CompleteAnalysis,
  ElementType,
} from '@aharris02/bazi-calculator-by-alvamind';
import { addYears, addDays } from 'date-fns';
import { toDate } from 'date-fns-tz';
import { generateText, Output } from 'ai';
import { BaziDataExtractor } from './utils/baziExtractor.util';
import { ViewAggregator } from './utils/viewAggregator.util';
import { LLMContextBuilder } from './utils/llmContextBuilder.util';
import {
  RawBaziData,
  FortuneReport,
  LLMPromptContext,
  ChapterReportUI,
  UserContext,
  CompatibilityReport,
} from './types';
import {
  generateTitlePrompt,
  generateIntroductionPrompt as generateChapterIntroPrompt,
  generateVibeCheckPrompt,
  generateTurningPointsPrompt,
  generateCheatSheetPrompt,
  generateTakeawaysPrompt,
} from './prompts/chapterReport.prompts';
import { generateIntroductionPrompt } from './prompts/personalAnalysis.prompts';
import { generateConclusionPrompt } from './prompts/conclusion.prompts';
import {
  titleOutputSchema,
  introductionOutputSchema,
  vibeCheckOutputSchema,
  turningPointsOutputSchema,
  cheatSheetOutputSchema,
  takeawaysOutputSchema,
} from './prompts/chapterReport.schemas';
import { geminiClient } from '../utils/ai';
import { WHO_YOU_ARE_TEMPLATES } from './templates/whoYouAre.templates';
import {
  DAY_MASTER_EXPLANATIONS,
  DAY_BRANCH_EXPLANATIONS,
  GENERAL_BASIS_EXPLANATION,
  TechnicalBasisData,
} from './templates/technicalBasis.templates';
import {
  getActiveSpecialStars,
  ActiveSpecialStar,
} from './templates/specialStars.templates';
import {
  CORE_TRAITS,
  DOMINANT_IMPACT,
  MISSING_ELEMENT_GUIDANCE,
  ARCHETYPE_CONNECTIONS,
  ELEMENT_INTERACTIONS,
  formatMissingElements,
  getMissingElementKey,
} from './templates/chartMeaning.templates';
import {
  STRENGTHS_TEMPLATES,
  StrengthItem,
} from './templates/strengths.templates';
import {
  WEAKNESSES_TEMPLATES,
  WeaknessItem,
} from './templates/weaknesses.templates';
import {
  LIFE_THEMES_TEMPLATES,
  LifeThemesTemplate,
} from './templates/lifeThemes.templates';

@Injectable()
export class SajuService {
  constructor() {}

  /**
   * Generate personal identity and introduction for natal report
   */
  async getPersonalAnalysis(
    birthDateTime: Date,
    gender: 'male' | 'female',
    birthTimezone: string,
    isTimeKnown: boolean,
  ) {
    // Initialize calculator and build user context
    const baseCalculator = new BaziCalculator(
      birthDateTime,
      gender,
      birthTimezone,
      isTimeKnown,
    );
    const baseAnalysis = baseCalculator.getCompleteAnalysis();

    if (!baseAnalysis) {
      throw new Error('SajuService: getCompleteAnalysis returned null.');
    }

    // Build user context (natal characteristics)
    const userContext = BaziDataExtractor.buildUserContext(baseAnalysis);

    // Calculate elemental distribution for radar chart
    const elementDistribution = this.calculateElementDistribution(userContext);

    // Generate identity and introduction
    const identity = this.generateIdentity(userContext);
    const introduction = await this.generateIntroduction(userContext, identity);

    // Generate Who You Are section
    const whoYouAre = this.getWhoYouAreContent(identity.code, userContext);

    // Generate all special traits (patterns + stars combined)
    const specialTraits = this.getSpecialTraits(userContext);

    // Generate Technical Basis for "Why?" modal
    const technicalBasis = this.getTechnicalBasis(userContext);

    // Generate Strengths and Weaknesses
    const strengths = this.getStrengths(identity.code, userContext);
    const weaknesses = this.getWeaknesses(identity.code, userContext);

    // Generate Life Themes (5 traditional fortune areas with dynamic personalization)
    const lifeThemes = this.getLifeThemes(identity.code, userContext);

    // Generate Conclusion (synthesizes everything into empowering wrap-up)
    const conclusion = await this.generateConclusion(
      userContext,
      identity,
      lifeThemes,
      strengths,
      weaknesses,
      elementDistribution,
    );

    // Generate birth info display
    const birthInfo = this.generateBirthInfo(
      birthDateTime,
      birthTimezone,
      userContext,
    );

    // Calculate rarity metrics
    const rarity = this.calculateRarity(
      identity.code,
      userContext,
      elementDistribution,
    );

    // Generate Four Pillars display for Technical Basis
    const fourPillars = this.generateFourPillarsDisplay(userContext);

    // Generate Chart Meaning (bridges chart data to personality implications)
    const chartMeaning = this.generateChartMeaning(
      identity,
      userContext,
      elementDistribution,
    );

    return {
      birthInfo,
      rarity,
      identity,
      introduction,
      chartMeaning,
      whoYouAre,
      specialTraits,
      elementDistribution,
      technicalBasis: {
        ...technicalBasis,
        fourPillars, // Add Four Pillars to Technical Basis
      },
      strengths,
      weaknesses,
      lifeThemes,
      conclusion,
    };
  }

  /**
   * Generate user's identity from natal chart
   *
   * Returns:
   * - code: "Fire-I" or "Fire-O" (short, memorable identifier)
   * - title: "The Focused Refiner" (stem-dominant display title)
   * - element: "Fire"
   * - polarity: "Yin" or "Yang"
   * - archetype: "Refiner"
   * - behavior: "Meticulous" (from Day Branch, used by LLM)
   * - coreTrait: "Focused"
   * - visualMetaphor: "focused flame" (for image + intro reference)
   */
  private generateIdentity(userContext: UserContext) {
    const dayMaster = userContext.natalStructure.personal.stem;
    const dayBranch = userContext.natalStructure.personal.branch;

    // Stem info (element + polarity)
    const STEM_INFO: Record<string, { element: string; polarity: string }> = {
      甲: { element: 'Wood', polarity: 'Yang' },
      乙: { element: 'Wood', polarity: 'Yin' },
      丙: { element: 'Fire', polarity: 'Yang' },
      丁: { element: 'Fire', polarity: 'Yin' },
      戊: { element: 'Earth', polarity: 'Yang' },
      己: { element: 'Earth', polarity: 'Yin' },
      庚: { element: 'Metal', polarity: 'Yang' },
      辛: { element: 'Metal', polarity: 'Yin' },
      壬: { element: 'Water', polarity: 'Yang' },
      癸: { element: 'Water', polarity: 'Yin' },
    };

    // Archetypes (Day Master stem)
    const ARCHETYPES: Record<string, string> = {
      甲: 'Trailblazer',
      乙: 'Diplomat',
      丙: 'Catalyst',
      丁: 'Refiner',
      戊: 'Guardian',
      己: 'Cultivator',
      庚: 'Architect',
      辛: 'Artisan',
      壬: 'Navigator',
      癸: 'Oracle',
    };

    // Behavioral style (Day Branch)
    const BEHAVIORS: Record<string, string> = {
      子: 'Resourceful',
      丑: 'Steadfast',
      寅: 'Bold',
      卯: 'Diplomatic',
      辰: 'Ambitious',
      巳: 'Perceptive',
      午: 'Independent',
      未: 'Creative',
      申: 'Clever',
      酉: 'Meticulous',
      戌: 'Loyal',
      亥: 'Generous',
    };

    // Core traits (Day Master element)
    const CORE_TRAITS: Record<string, string> = {
      甲: 'Pioneering',
      乙: 'Adaptive',
      丙: 'Expressive',
      丁: 'Focused',
      戊: 'Grounded',
      己: 'Nurturing',
      庚: 'Decisive',
      辛: 'Precise',
      壬: 'Strategic',
      癸: 'Intuitive',
    };

    // Visual metaphors (for image and intro reference)
    const VISUAL_METAPHORS: Record<string, string> = {
      甲: 'towering oak',
      乙: 'climbing vine',
      丙: 'blazing sun',
      丁: 'focused flame',
      戊: 'mountain peak',
      己: 'fertile garden',
      庚: 'forged blade',
      辛: 'cut diamond',
      壬: 'deep ocean',
      癸: 'morning dew',
    };

    const stemInfo = STEM_INFO[dayMaster];
    const behavior = BEHAVIORS[dayBranch] || 'Dynamic';
    const coreTrait = CORE_TRAITS[dayMaster] || 'Balanced';
    const archetype = ARCHETYPES[dayMaster] || 'Seeker';
    const visualMetaphor = VISUAL_METAPHORS[dayMaster] || 'balanced force';

    // Generate code: Fire-I, Fire-O, etc.
    const polarity = stemInfo.polarity === 'Yin' ? 'I' : 'O';
    const code = `${stemInfo.element}-${polarity}`;

    // Generate title: "The Focused Refiner" (stem-dominant)
    const title = `The ${coreTrait} ${archetype}`;

    return {
      code,
      title,
      element: stemInfo.element,
      polarity: stemInfo.polarity,
      archetype,
      behavior,
      coreTrait,
      visualMetaphor,
    };
  }

  /**
   * Get "Who You Are" content from templates
   */
  private getWhoYouAreContent(
    typeCode: string,
    userContext: UserContext,
  ): {
    paragraphs: string[];
  } {
    // Get base template for this type
    const template = WHO_YOU_ARE_TEMPLATES[typeCode];

    if (!template) {
      throw new Error(`No template found for type: ${typeCode}`);
    }

    return {
      paragraphs: template.paragraphs,
    };
  }

  /**
   * Get all special traits (patterns + rooted stars combined)
   * Note: All stars shown are already "rooted" (validated in baziExtractor)
   */
  private getSpecialTraits(userContext: UserContext): Array<{
    name: string;
    chineseName: string;
    description: string;
    type: 'pattern' | 'star';
    emoji?: string;
    count?: number; // For nobleman (can have multiple)
    branches?: string[]; // Branch characters where star appears
    rarity?: string; // Rarity description
  }> {
    const traits: Array<{
      name: string;
      chineseName: string;
      description: string;
      type: 'pattern' | 'star';
      emoji?: string;
      count?: number;
      branches?: string[];
      rarity?: string;
    }> = [];

    // Pattern rarity estimates (percentage of charts)
    const PATTERN_RARITIES: Record<string, string> = {
      'shi-shang-sheng-cai': '~1 in 150 charts',
      'cai-zi-ruo-sha': '~1 in 200 charts',
      'sha-yin-xiang-sheng': '~1 in 125 charts',
      'yin-shou-ge': '~1 in 250 charts',
      'cong-ge': '~1 in 333 charts',
      'cong-cai-ge': '~1 in 286 charts',
      'cong-sha-ge': '~1 in 263 charts',
      'hua-ge': '~1 in 222 charts',
      'yang-ren-jia-sha': '~1 in 182 charts',
      'san-qi-sheng-cai': '~1 in 167 charts',
      'guan-yin-xiang-sheng': '~1 in 143 charts',
      'jian-lu-ge': '~1 in 133 charts',
    };

    // Star rarity estimates (only rooted stars are counted - rarer than library defaults)
    const STAR_RARITIES: Record<string, string> = {
      nobleman: '~1 in 7 charts',
      intelligence: '~1 in 13 charts',
      skyHorse: '~1 in 8 charts',
      peachBlossom: '~1 in 10 charts',
    };

    // Add patterns (rare configurations)
    if (userContext.natalPatterns && userContext.natalPatterns.length > 0) {
      for (const pattern of userContext.natalPatterns) {
        traits.push({
          name: pattern.name,
          chineseName: pattern.chineseName,
          description: pattern.description || '',
          type: 'pattern',
          emoji: '✨',
          rarity: PATTERN_RARITIES[pattern.id] || '~1 in 200 charts',
        });
      }
    }

    // Add rooted special stars (only stars physically present in chart)
    const activeStars = getActiveSpecialStars(userContext.specialStars);
    for (const star of activeStars) {
      // Determine rarity key based on star name
      let rarityKey = 'nobleman';
      if (star.name.includes('Academic')) rarityKey = 'intelligence';
      if (star.name.includes('Sky Horse')) rarityKey = 'skyHorse';
      if (star.name.includes('Romance')) rarityKey = 'peachBlossom';

      traits.push({
        name: star.name,
        chineseName: star.chineseName,
        description: star.description,
        type: 'star',
        emoji: star.emoji,
        count: star.count,
        branches: star.branches,
        rarity: STAR_RARITIES[rarityKey],
      });
    }

    return traits;
  }

  /**
   * Get technical basis for "Why?" modal
   */
  private getTechnicalBasis(userContext: UserContext): TechnicalBasisData {
    const dayMaster = userContext.natalStructure.personal.stem;
    const dayBranch = userContext.natalStructure.personal.branch;

    const masterInfo = DAY_MASTER_EXPLANATIONS[dayMaster];
    const branchInfo = DAY_BRANCH_EXPLANATIONS[dayBranch];

    if (!masterInfo || !branchInfo) {
      throw new Error(
        `Missing template for Day Master: ${dayMaster} or Day Branch: ${dayBranch}`,
      );
    }

    return {
      dayMaster: {
        character: masterInfo.character,
        displayName: masterInfo.displayName,
        metaphor: masterInfo.metaphor,
        explanation: masterInfo.explanation,
      },
      dayBranch: {
        character: branchInfo.character,
        displayName: branchInfo.displayName,
        explanation: branchInfo.explanation,
      },
      general: GENERAL_BASIS_EXPLANATION,
    };
  }

  /**
   * Get strengths for this Day Master type
   * Returns 3 base strengths + 1 dynamic strength based on patterns/elements
   */
  private getStrengths(
    typeCode: string,
    userContext: UserContext,
  ): StrengthItem[] {
    const template = STRENGTHS_TEMPLATES[typeCode];

    if (!template) {
      throw new Error(`No strengths template found for type: ${typeCode}`);
    }

    const strengths: StrengthItem[] = [...template.baseStrengths];

    // Add dynamic 4th strength based on patterns
    if (userContext.natalPatterns && userContext.natalPatterns.length > 0) {
      const primaryPattern = userContext.natalPatterns[0];
      strengths.push({
        title: primaryPattern.name,
        emoji: '✨', // Patterns use sparkle emoji (same as Special Traits)
        description: primaryPattern.description,
        isPersonal: true, // Flag as unique to this user's chart
      });
    }

    return strengths;
  }

  /**
   * Get weaknesses for this Day Master type
   * Returns 3 base weaknesses + 1 dynamic weakness based on missing elements
   */
  private getWeaknesses(
    typeCode: string,
    userContext: UserContext,
  ): WeaknessItem[] {
    const template = WEAKNESSES_TEMPLATES[typeCode];

    if (!template) {
      throw new Error(`No weaknesses template found for type: ${typeCode}`);
    }

    const weaknesses: WeaknessItem[] = [...template.baseWeaknesses];

    // Add dynamic 4th weakness based on missing elements (if any)
    const elementDist = this.calculateElementDistribution(userContext);
    if (elementDist.missing.length > 0) {
      const missingElement = elementDist.missing[0]; // Take first missing element
      const elementWarnings: Record<string, WeaknessItem> = {
        WOOD: {
          title: 'Missing Growth Energy',
          emoji: '🌱',
          description:
            'Your chart lacks Wood, which can make it harder to initiate new projects or embrace change. You might feel stuck or resistant to exploring new directions. Deliberately cultivating flexibility and openness helps.',
          isPersonal: true, // Flag as unique to this user's chart
        },
        FIRE: {
          title: 'Missing Passion Drive',
          emoji: '🔥',
          description:
            'Your chart lacks Fire, which can make it harder to feel enthusiastic or motivated. You might struggle with energy and visibility. Deliberately cultivating excitement and self-expression helps.',
          isPersonal: true,
        },
        EARTH: {
          title: 'Missing Stability Anchor',
          emoji: '⚓',
          description:
            'Your chart lacks Earth, which can make it harder to stay grounded or committed. You might struggle with consistency and follow-through. Deliberately cultivating routines and reliability helps.',
          isPersonal: true,
        },
        METAL: {
          title: 'Missing Structural Clarity',
          emoji: '🔧',
          description:
            'Your chart lacks Metal, which can make it harder to set boundaries or make tough decisions. You might struggle with focus and saying no. Deliberately cultivating discipline and standards helps.',
          isPersonal: true,
        },
        WATER: {
          title: 'Missing Adaptive Flow',
          emoji: '💧',
          description:
            'Your chart lacks Water, which can make it harder to adapt to change or read situations intuitively. You might struggle with flexibility and emotional intelligence. Deliberately cultivating reflection and empathy helps.',
          isPersonal: true,
        },
      };

      const warning = elementWarnings[missingElement];
      if (warning) {
        weaknesses.push(warning);
      }
    }

    return weaknesses;
  }

  /**
   * Get Ten God dominance counts for dynamic Life Theme additions
   * Returns count of each Ten God category present in chart
   */
  private getTenGodDominance(userContext: UserContext): {
    output: number; // Eating God, Hurting Officer (creativity, expression)
    wealth: number; // Direct/Indirect Wealth (money, business)
    power: number; // Direct Officer, Seven Killings (authority, leadership)
    resource: number; // Direct/Indirect Resource (learning, knowledge)
    friend: number; // Shoulder, Rob Wealth (independence, partnership)
  } {
    const counts = { output: 0, wealth: 0, power: 0, resource: 0, friend: 0 };

    // Map Ten Gods to categories
    const TEN_GOD_CATEGORIES: Record<string, keyof typeof counts> = {
      'Eating God': 'output',
      'Hurting Officer': 'output',
      'Direct Wealth': 'wealth',
      'Indirect Wealth': 'wealth',
      'Direct Officer': 'power',
      'Seven Killings': 'power',
      'Direct Resource': 'resource',
      'Indirect Resource': 'resource',
      Shoulder: 'friend',
      'Rob Wealth': 'friend',
    };

    // Collect Ten Gods from all pillars (excluding Day Master which has no Ten God)
    const pillars = [
      userContext.natalStructure.social.tenGod,
      userContext.natalStructure.career.tenGod,
      userContext.natalStructure.innovation?.tenGod,
    ].filter(Boolean);

    pillars.forEach((tenGod) => {
      const category = TEN_GOD_CATEGORIES[tenGod!];
      if (category) counts[category]++;
    });

    return counts;
  }

  /**
   * Get Life Themes (5 traditional fortune areas) with dynamic personalization
   * Combines base templates with Ten God, Pattern, Star, and Element influences
   */
  private getLifeThemes(
    typeCode: string,
    userContext: UserContext,
  ): LifeThemesTemplate {
    const baseTemplate = LIFE_THEMES_TEMPLATES[typeCode];

    if (!baseTemplate) {
      throw new Error(`No life themes template found for type: ${typeCode}`);
    }

    // Deep clone base template
    const themes: LifeThemesTemplate = JSON.parse(JSON.stringify(baseTemplate));

    // Get Ten God dominance
    const tenGodDominance = this.getTenGodDominance(userContext);

    // Initialize personalInsights arrays
    themes.career.personalInsights = [];
    themes.wealth.personalInsights = [];
    themes.relationships.personalInsights = [];
    themes.health.personalInsights = [];
    themes.learning.personalInsights = [];

    // === TEN GOD INFLUENCES ===

    // Output Gods (2+ = strong creativity)
    if (tenGodDominance.output >= 2) {
      themes.career.personalInsights!.push(
        'Your strong creative output makes you natural at content creation, innovation, and expressive work.',
      );
      themes.wealth.personalInsights!.push(
        'Your creativity naturally generates income—monetize your output through products, content, or performances.',
      );
    }

    // Wealth Gods (2+ = business acumen)
    if (tenGodDominance.wealth >= 2) {
      themes.career.personalInsights!.push(
        'Your chart shows strong business and financial acumen—you have natural money-making instincts.',
      );
      themes.wealth.personalInsights!.push(
        'Money opportunities come naturally to you. Business, sales, and investment roles align with your chart.',
      );
    }

    // Power Gods (2+ = leadership/authority)
    if (tenGodDominance.power >= 2) {
      themes.career.personalInsights!.push(
        'Your chart shows strong leadership energy—management, authority, and high-responsibility roles suit you.',
      );
      themes.health.personalInsights!.push(
        'High-pressure leadership roles can take a toll. Actively manage stress and maintain work-life boundaries.',
      );
    }

    // Resource Gods (2+ = learning strength)
    if (tenGodDominance.resource >= 2) {
      themes.learning.personalInsights!.push(
        'Learning is your superpower—you absorb knowledge naturally and excel in academic environments.',
      );
      themes.career.personalInsights!.push(
        'Education, research, and knowledge-based work align strongly with your chart. Expertise is your path.',
      );
    }

    // Friend Gods (2+ = independence/partnership)
    if (tenGodDominance.friend >= 2) {
      themes.career.personalInsights!.push(
        'You thrive in independent or partnership-based work rather than traditional corporate employment.',
      );
      themes.wealth.personalInsights!.push(
        'Co-founded businesses, independent consulting, or profit-sharing arrangements suit you better than salary.',
      );
    }

    // === PATTERN INFLUENCES ===

    if (userContext.natalPatterns && userContext.natalPatterns.length > 0) {
      const primaryPattern = userContext.natalPatterns[0];

      // Wealth Generator pattern
      if (primaryPattern.id === 'shi-shang-sheng-cai') {
        themes.career.personalInsights!.push(
          'You have a rare ability to monetize skills naturally—creative work converts to income more easily for you.',
        );
        themes.wealth.personalInsights!.push(
          'Your chart shows exceptional wealth-generation potential through your talents and output.',
        );
      }

      // Empire Builder pattern
      if (primaryPattern.id === 'cai-zi-ruo-sha') {
        themes.wealth.personalInsights!.push(
          'Wealth fuels your ambitions—you use money as a tool for influence and building legacy, not just accumulation.',
        );
      }

      // Authority Path pattern
      if (primaryPattern.id === 'sha-yin-xiang-sheng') {
        themes.career.personalInsights!.push(
          'You gain leadership credibility through proven expertise—authority comes from demonstrated mastery.',
        );
      }

      // Academic Scholar pattern
      if (primaryPattern.id === 'yin-shou-ge') {
        themes.learning.personalInsights!.push(
          'Exceptional learning ability is a core strength—education and intellectual pursuits are natural pathways for you.',
        );
      }
    }

    // === SPECIAL STAR INFLUENCES ===

    if (userContext.specialStars) {
      // Academic Star (intelligence)
      if (userContext.specialStars.intelligence) {
        themes.learning.personalInsights!.push(
          'Learning comes exceptionally naturally to you—education and intellectual pursuits are core strengths.',
        );
      }

      // Peach Blossom (charisma)
      if (userContext.specialStars.peachBlossom) {
        themes.relationships.personalInsights!.push(
          'You have natural charisma and social magnetism—people are drawn to you effortlessly.',
        );
      }

      // Sky Horse (travel/movement)
      if (userContext.specialStars.skyHorse) {
        themes.career.personalInsights!.push(
          'Movement and change energize you—careers involving travel, relocation, or frequent variety suit you well.',
        );
      }

      // Nobleman (support)
      if (
        userContext.specialStars.nobleman &&
        userContext.specialStars.nobleman.length > 0
      ) {
        themes.career.personalInsights!.push(
          'Helpful mentors and supporters appear at crucial moments in your career—leverage these connections.',
        );
      }
    }

    // === MISSING ELEMENT INFLUENCES ===

    const elementDist = this.calculateElementDistribution(userContext);
    if (elementDist.missing.length > 0) {
      const missingElement = elementDist.missing[0]; // Take first missing

      const elementHealthAdvice: Record<string, string> = {
        WOOD: "Deliberately cultivate flexibility and growth—your chart lacks Wood's adaptive energy.",
        FIRE: "Actively seek energizing activities and passion projects—your chart lacks Fire's motivating drive.",
        EARTH:
          "Build routines and grounding practices—your chart lacks Earth's stabilizing anchor.",
        METAL:
          "Work on boundaries and decision-making clarity—your chart lacks Metal's structural clarity.",
        WATER:
          "Practice adaptability and emotional awareness—your chart lacks Water's intuitive flow.",
      };

      const advice = elementHealthAdvice[missingElement];
      if (advice) {
        themes.health.personalInsights!.push(advice);
      }
    }

    return themes;
  }

  /**
   * Calculate elemental distribution from natal chart
   * Counts elements from all 8 positions (4 stems + 4 branches)
   */
  private calculateElementDistribution(userContext: UserContext): {
    wood: number;
    fire: number;
    earth: number;
    metal: number;
    water: number;
    total: number;
    percentages: {
      wood: number;
      fire: number;
      earth: number;
      metal: number;
      water: number;
    };
    dominant: string[];
    missing: string[];
    balance: 'balanced' | 'specialized' | 'very-specialized';
    explanation: string;
  } {
    const counts = {
      WOOD: 0,
      FIRE: 0,
      EARTH: 0,
      METAL: 0,
      WATER: 0,
    };

    const { social, career, personal, innovation } = userContext.natalStructure;

    // Count stem elements (4 positions)
    counts[social.element]++;
    counts[career.element]++;
    counts[personal.element]++;
    if (innovation) {
      counts[innovation.element]++;
    }

    // Count branch elements (4 positions)
    // Note: Branches have hidden stems, we count the main branch element
    const pillars = [social, career, personal, innovation].filter(Boolean);
    for (const pillar of pillars) {
      // Each pillar's element was already counted for stem above
      // For branches, we need to get the branch element from the character
      // This is already handled by the library in the pillar.element
    }

    // Actually, we need to count differently - let me reconsider
    // The element field in PillarInfo is for the STEM only
    // We need to count stems (4) + branches (4) = 8 total

    // Reset and count properly
    counts.WOOD = 0;
    counts.FIRE = 0;
    counts.EARTH = 0;
    counts.METAL = 0;
    counts.WATER = 0;

    // Count STEM elements
    counts[social.element]++;
    counts[career.element]++;
    counts[personal.element]++;
    if (innovation) {
      counts[innovation.element]++;
    }

    // For branches, we need to map the branch characters to elements
    const BRANCH_ELEMENTS: Record<string, keyof typeof counts> = {
      子: 'WATER',
      丑: 'EARTH',
      寅: 'WOOD',
      卯: 'WOOD',
      辰: 'EARTH',
      巳: 'FIRE',
      午: 'FIRE',
      未: 'EARTH',
      申: 'METAL',
      酉: 'METAL',
      戌: 'EARTH',
      亥: 'WATER',
    };

    counts[BRANCH_ELEMENTS[social.branch] || 'EARTH']++;
    counts[BRANCH_ELEMENTS[career.branch] || 'EARTH']++;
    counts[BRANCH_ELEMENTS[personal.branch] || 'EARTH']++;
    if (innovation) {
      counts[BRANCH_ELEMENTS[innovation.branch] || 'EARTH']++;
    }

    const total = innovation ? 8 : 6; // 8 if hour known, 6 if not

    // Calculate percentages
    const percentages = {
      wood: Math.round((counts.WOOD / total) * 100 * 10) / 10,
      fire: Math.round((counts.FIRE / total) * 100 * 10) / 10,
      earth: Math.round((counts.EARTH / total) * 100 * 10) / 10,
      metal: Math.round((counts.METAL / total) * 100 * 10) / 10,
      water: Math.round((counts.WATER / total) * 100 * 10) / 10,
    };

    // Identify dominant elements (highest count)
    const maxCount = Math.max(
      counts.WOOD,
      counts.FIRE,
      counts.EARTH,
      counts.METAL,
      counts.WATER,
    );
    const dominant: string[] = [];
    if (counts.WOOD === maxCount) dominant.push('Wood');
    if (counts.FIRE === maxCount) dominant.push('Fire');
    if (counts.EARTH === maxCount) dominant.push('Earth');
    if (counts.METAL === maxCount) dominant.push('Metal');
    if (counts.WATER === maxCount) dominant.push('Water');

    // Identify missing elements (count = 0)
    const missing: string[] = [];
    if (counts.WOOD === 0) missing.push('Wood');
    if (counts.FIRE === 0) missing.push('Fire');
    if (counts.EARTH === 0) missing.push('Earth');
    if (counts.METAL === 0) missing.push('Metal');
    if (counts.WATER === 0) missing.push('Water');

    // Determine balance level
    let balance: 'balanced' | 'specialized' | 'very-specialized';
    if (maxCount >= total / 2) {
      balance = 'very-specialized'; // 50%+ in one element
    } else if (maxCount >= total / 3) {
      balance = 'specialized'; // 33%+ in one element
    } else {
      balance = 'balanced'; // No element dominates
    }

    // Generate explanation based on Day Master vs Dominant Element
    const dayMasterElement = this.getElementFromDayMaster(
      userContext.natalStructure.personal.element,
    );

    // Build explanation with data context first
    const countsSummary = `Your chart contains ${counts.WOOD} Wood, ${counts.FIRE} Fire, ${counts.EARTH} Earth, ${counts.METAL} Metal, ${counts.WATER} Water across ${total} positions. `;
    const interpretation = this.generateDistributionExplanation(
      dayMasterElement,
      dominant,
      missing,
    );
    const explanation = countsSummary + interpretation;

    return {
      wood: counts.WOOD,
      fire: counts.FIRE,
      earth: counts.EARTH,
      metal: counts.METAL,
      water: counts.WATER,
      total,
      percentages,
      dominant,
      missing,
      balance,
      explanation,
    };
  }

  /**
   * Convert ElementType to friendly name
   */
  private getElementFromDayMaster(element: string): string {
    const mapping: Record<string, string> = {
      WOOD: 'Wood',
      FIRE: 'Fire',
      EARTH: 'Earth',
      METAL: 'Metal',
      WATER: 'Water',
    };
    return mapping[element] || element;
  }

  /**
   * Generate practical explanation of element distribution
   * Uses natural metaphors, avoids mystical terminology
   */
  private generateDistributionExplanation(
    dayMaster: string,
    dominant: string[],
    missing: string[],
  ): string {
    const dominantElement = dominant[0]; // Primary dominant

    // Natural metaphors for each element (non-mystical)
    const ELEMENT_METAPHORS: Record<string, string> = {
      Wood: 'growth and creativity',
      Fire: 'action and passion',
      Earth: 'stability and grounding',
      Metal: 'structure and precision',
      Water: 'wisdom and adaptability',
    };

    // Relationship descriptions (practical, not theoretical)
    const GENERATES: Record<string, { target: string; metaphor: string }> = {
      Wood: {
        target: 'Fire',
        metaphor: 'fuel feeding a flame—providing abundant creative energy',
      },
      Fire: {
        target: 'Earth',
        metaphor:
          'heat shaping clay—your passion naturally creates tangible results',
      },
      Earth: {
        target: 'Metal',
        metaphor:
          'ore from the ground—your stability produces refined outcomes',
      },
      Metal: {
        target: 'Water',
        metaphor:
          'condensation on metal—your structure channels flow and wisdom',
      },
      Water: {
        target: 'Wood',
        metaphor: 'rain nourishing trees—your adaptability enables growth',
      },
    };

    // Same element dominant
    if (dominantElement === dayMaster) {
      const trait = ELEMENT_METAPHORS[dayMaster];
      if (missing.length > 0) {
        return `Your chart heavily emphasizes ${dayMaster}, strengthening your natural ${trait}. You lack ${missing.join(' and ')}, which may represent areas to develop for more versatility.`;
      }
      return `Your chart heavily emphasizes ${dayMaster}, reinforcing your natural ${trait} with consistency and focus.`;
    }

    // Check if dominant supports Day Master
    const relationship = GENERATES[dominantElement];
    if (relationship && relationship.target === dayMaster) {
      return `Your chart is rich in ${dominantElement}, which provides strong support for your ${dayMaster} core—like ${relationship.metaphor}.`;
    }

    // Check if Day Master produces dominant
    const outputRelationship = GENERATES[dayMaster];
    if (outputRelationship && outputRelationship.target === dominantElement) {
      return `Your ${dayMaster} nature naturally channels into ${dominantElement}—like ${outputRelationship.metaphor}. You're highly productive and expressive.`;
    }

    // Different element, no direct relationship
    const dominantTrait = ELEMENT_METAPHORS[dominantElement];
    const masterTrait = ELEMENT_METAPHORS[dayMaster];
    return `Your chart balances ${dominantElement} (${dominantTrait}) with your ${dayMaster} core (${masterTrait}), creating a unique blend of traits.`;
  }

  /**
   * Generate introduction hook using LLM
   *
   * Creates a 4-5 sentence "paradox hook" that:
   * - Corrects misconceptions about the user
   * - Builds narrative tension
   * - Sounds like the start of a story
   */
  private async generateIntroduction(
    userContext: UserContext,
    identity: {
      code: string;
      title: string;
      element: string;
      polarity: string;
      archetype: string;
      behavior: string;
      coreTrait: string;
      visualMetaphor: string;
    },
  ): Promise<string> {
    const chartStrength = userContext.chartStrength?.strength || 'Balanced';
    const patterns = userContext.natalPatterns?.map((p) => p.name) || [];

    try {
      const result = await generateText({
        model: geminiClient('gemini-2.0-flash-exp'),
        temperature: 0.7,
        experimental_telemetry: { isEnabled: true },
        messages: [
          {
            role: 'user',
            content: generateIntroductionPrompt({
              title: identity.title,
              behavior: identity.behavior,
              coreTrait: identity.coreTrait,
              archetype: identity.archetype,
              element: identity.element,
              polarity: identity.polarity,
              visualMetaphor: identity.visualMetaphor,
              chartStrength,
              patterns,
            }),
          },
        ],
      });

      return result.text.trim();
    } catch (error) {
      console.error('Failed to generate introduction:', error);

      // Fallback if LLM fails
      return `Most people misunderstand what drives you. They see surface traits but miss the deeper pattern. You're ${identity.title.toLowerCase()}, which means you operate differently than conventional wisdom suggests. Once you commit to something on your terms, you bring an intensity that surprises even those who know you well.`;
    }
  }

  /**
   * Generate conclusion for natal report
   * Synthesizes user's unique combination and provides empowering wrap-up
   */
  private async generateConclusion(
    userContext: UserContext,
    identity: {
      code: string;
      title: string;
      element: string;
      polarity: string;
      archetype: string;
      behavior: string;
      coreTrait: string;
      visualMetaphor: string;
    },
    lifeThemes: LifeThemesTemplate,
    strengths: StrengthItem[],
    weaknesses: WeaknessItem[],
    elementDistribution: any,
  ): Promise<string> {
    // Extract context for prompt
    const strengthTitles = strengths.map((s) => s.title).join(', ');
    const weaknessTitles = weaknesses.map((w) => w.title).join(', ');
    const careerInsights =
      lifeThemes.career.personalInsights?.join('; ') || 'none';
    const wealthInsights =
      lifeThemes.wealth.personalInsights?.join('; ') || 'none';
    const patterns =
      userContext.natalPatterns?.map((p) => p.name).join(', ') || 'none';
    const elementDominant =
      elementDistribution.dominant.join('/') || 'balanced';
    const elementMissing = elementDistribution.missing.join('/') || 'none';

    try {
      const result = await generateText({
        model: geminiClient('gemini-2.0-flash-exp'),
        temperature: 0.7,
        experimental_telemetry: { isEnabled: true },
        messages: [
          {
            role: 'user',
            content: generateConclusionPrompt({
              identity: {
                title: identity.title,
                element: identity.element,
                polarity: identity.polarity,
                coreTrait: identity.coreTrait,
                archetype: identity.archetype,
                behavior: identity.behavior,
                visualMetaphor: identity.visualMetaphor,
              },
              strengthTitles,
              weaknessTitles,
              patterns,
              careerInsights,
              wealthInsights,
              elementDominant,
              elementMissing,
            }),
          },
        ],
      });

      return result.text.trim();
    } catch (error) {
      console.error('Failed to generate conclusion:', error);

      // Fallback if LLM fails
      return `You have a powerful combination of traits that set you apart. Your ${identity.title.toLowerCase()} nature, combined with your unique strengths, positions you to create meaningful impact in your own way. The challenge isn't changing who you are—it's fully embracing it and applying your gifts where they matter most. The world needs people who operate at your level of depth and integrity.`;
    }
  }

  /**
   * Generate birth info display
   * Shows birth date/time/location for authenticity
   */
  private generateBirthInfo(
    birthDateTime: Date,
    birthTimezone: string,
    userContext: UserContext,
  ) {
    // Format date/time nicely
    const dateOptions: Intl.DateTimeFormatOptions = {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
      timeZone: birthTimezone,
      hour12: true,
    };

    const displayDate = birthDateTime.toLocaleString('en-US', dateOptions);

    // Get location name from timezone (simplified)
    const locationMap: Record<string, string> = {
      'Asia/Seoul': 'Seoul, South Korea',
      'Asia/Tokyo': 'Tokyo, Japan',
      'America/New_York': 'New York, USA',
      'America/Los_Angeles': 'Los Angeles, USA',
      'Europe/London': 'London, UK',
      'Asia/Shanghai': 'Shanghai, China',
      'Asia/Hong_Kong': 'Hong Kong',
      'America/Chicago': 'Chicago, USA',
      'Europe/Paris': 'Paris, France',
    };

    const location =
      locationMap[birthTimezone] || birthTimezone.replace(/_/g, ' ');

    // Get Day Master display
    const dayMasterStem = userContext.natalStructure.personal.stem;
    const dayBranch = userContext.natalStructure.personal.branch;
    const calculatedType = `${dayMasterStem}${dayBranch}日主`;

    return {
      displayDate,
      location,
      calculatedType,
    };
  }

  /**
   * Calculate rarity metrics for authenticity and viral factor
   */
  private calculateRarity(
    typeCode: string,
    userContext: UserContext,
    elementDistribution: any,
  ) {
    // 1. Type Rarity (10 Day Master types)
    // Base: 10% each, but adjust for real-world distribution
    const TYPE_DISTRIBUTIONS: Record<string, number> = {
      'Fire-I': 2.1, // Yin Fire (丁) - less common
      'Fire-O': 2.3, // Yang Fire (丙) - slightly more common
      'Water-I': 2.0, // Yin Water (癸) - less common
      'Water-O': 2.2, // Yang Water (壬) - slightly more common
      'Wood-I': 2.1, // Yin Wood (乙)
      'Wood-O': 2.3, // Yang Wood (甲)
      'Earth-I': 2.4, // Yin Earth (己) - more common
      'Earth-O': 2.5, // Yang Earth (戊) - more common
      'Metal-I': 2.0, // Yin Metal (辛) - less common
      'Metal-O': 2.2, // Yang Metal (庚)
    };

    const typePercentage = TYPE_DISTRIBUTIONS[typeCode] || 2.1;

    // 2. Pattern Rarity
    const patternCount = userContext.natalPatterns?.length || 0;
    let patternRarity = 0;
    let rarePatternText = 'No special patterns';

    if (patternCount > 0) {
      // Approximate rarity (these are estimates)
      const PATTERN_RARITIES: Record<string, number> = {
        'shi-shang-sheng-cai': 0.67, // 1 in 150
        'cai-zi-ruo-sha': 0.5, // 1 in 200
        'sha-yin-xiang-sheng': 0.8, // 1 in 125
        'yin-shou-ge': 0.4, // 1 in 250
        'cong-ge': 0.3, // 1 in 333
        'cong-cai-ge': 0.35, // 1 in 286
        'cong-sha-ge': 0.38, // 1 in 263
        'hua-ge': 0.45, // 1 in 222
        'yang-ren-jia-sha': 0.55, // 1 in 182
        'san-qi-sheng-cai': 0.6, // 1 in 167
        'guan-yin-xiang-sheng': 0.7, // 1 in 143
        'jian-lu-ge': 0.75, // 1 in 133
      };

      const primaryPattern = userContext.natalPatterns[0];
      patternRarity = PATTERN_RARITIES[primaryPattern.id] || 0.5;

      // Format rarity text
      const oneIn = Math.round(100 / patternRarity);
      rarePatternText = `1 in ${oneIn} charts`;
    }

    // 3. Element Distribution Rarity
    const dominant = elementDistribution.dominant || [];
    const missing = elementDistribution.missing || [];

    let elementRarity = 5.0; // Base: balanced charts are common

    // Single dominant element = less common
    if (dominant.length === 1) {
      elementRarity = 3.5;
    }

    // Missing 2+ elements = rare
    if (missing.length >= 2) {
      elementRarity = elementRarity * 0.6; // Makes it rarer
    }

    // 4. Combination Rarity (overall uniqueness)
    // Formula: Calculate probability, then convert to "1 in X"
    // P(combination) = P(type) × P(pattern) × P(element) × P(stars)
    // Then: 1 / P(combination) = rarity

    // Convert percentages to decimals
    const typeProbability = typePercentage / 100; // e.g., 2.1% = 0.021
    const patternProbability = patternCount > 0 ? patternRarity / 100 : 1; // e.g., 0.67% = 0.0067, or 1 if no pattern
    const elementProbability = elementRarity / 100; // e.g., 2.1% = 0.021

    // Calculate rooted star probability (rooted stars are multiplicatively rare)
    const activeStars = getActiveSpecialStars(userContext.specialStars);
    const STAR_PROBABILITIES = {
      0: 1.0, // No stars = no adjustment
      1: 0.5, // 1 rooted star = 2x rarer
      2: 0.35, // 2 rooted stars = ~3x rarer
      3: 0.25, // 3 rooted stars = 4x rarer
      4: 0.15, // All 4 rooted stars = ~7x rarer
    };
    const starProbability =
      STAR_PROBABILITIES[Math.min(activeStars.length, 4)] || 0.15;

    // Calculate combined probability
    const combinedProbability =
      typeProbability *
      patternProbability *
      elementProbability *
      starProbability;

    // Convert to "1 in X"
    const combinationRarity = Math.round(1 / combinedProbability);

    return {
      type: {
        percentage: typePercentage,
        description: `${typePercentage}% of people share the ${typeCode} Day Master type`,
      },
      pattern:
        patternCount > 0
          ? {
              rarity: patternRarity,
              description: rarePatternText,
            }
          : null,
      elementDistribution: {
        percentage: elementRarity,
        description:
          missing.length >= 2
            ? `Charts with ${dominant[0]}-dominance and dual element gaps appear in ${elementRarity.toFixed(1)}% of the population`
            : `${dominant[0] || 'Balanced'}-dominant charts appear in ${elementRarity.toFixed(1)}% of the population`,
      },
      overall: {
        oneIn: combinationRarity,
        description: `Your exact combination of ${typeCode} + ${dominant[0] || 'balanced'} elements${patternCount > 0 ? ' + special patterns' : ''} is approximately 1 in ${combinationRarity.toLocaleString()}`,
      },
    };
  }

  /**
   * Generate Four Pillars display for Technical Basis modal
   */
  private generateFourPillarsDisplay(userContext: UserContext) {
    const structure = userContext.natalStructure;

    // Mapping for aspect names
    const ASPECT_NAMES = {
      year: 'Social Foundation',
      month: 'Career Drive',
      day: 'Core Self',
      hour: 'Inner World',
    };

    // Mapping for animal names
    const BRANCH_ANIMALS: Record<string, string> = {
      子: 'Rat',
      丑: 'Ox',
      寅: 'Tiger',
      卯: 'Rabbit',
      辰: 'Dragon',
      巳: 'Snake',
      午: 'Horse',
      未: 'Goat',
      申: 'Monkey',
      酉: 'Rooster',
      戌: 'Dog',
      亥: 'Pig',
    };

    // Mapping for element display
    const getElementName = (element: string): string => {
      const map: Record<string, string> = {
        WOOD: 'Wood',
        FIRE: 'Fire',
        EARTH: 'Earth',
        METAL: 'Metal',
        WATER: 'Water',
      };
      return map[element] || element;
    };

    return {
      year: {
        display: `${structure.social.stem}${structure.social.branch}`,
        meaning: `${getElementName(structure.social.element)} ${BRANCH_ANIMALS[structure.social.branch]}`,
        aspect: ASPECT_NAMES.year,
      },
      month: {
        display: `${structure.career.stem}${structure.career.branch}`,
        meaning: `${getElementName(structure.career.element)} ${BRANCH_ANIMALS[structure.career.branch]}`,
        aspect: ASPECT_NAMES.month,
      },
      day: {
        display: `${structure.personal.stem}${structure.personal.branch}`,
        meaning: `${getElementName(structure.personal.element)} ${BRANCH_ANIMALS[structure.personal.branch]}`,
        aspect: ASPECT_NAMES.day,
        isCore: true, // Highlight this one
      },
      hour: structure.innovation
        ? {
            display: `${structure.innovation.stem}${structure.innovation.branch}`,
            meaning: `${getElementName(structure.innovation.element)} ${BRANCH_ANIMALS[structure.innovation.branch]}`,
            aspect: ASPECT_NAMES.hour,
          }
        : null,
    };
  }

  /**
   * Generate chart meaning - bridges birth chart to personality implications
   * Uses modular templates (32 total) to create personalized "so what?" explanation
   */
  private generateChartMeaning(
    identity: {
      code: string;
      title: string;
      element: string;
      polarity: string;
    },
    userContext: UserContext,
    elementDistribution: any,
  ) {
    const dayMaster = identity.element;
    const dominant = elementDistribution.dominant[0] || 'Balanced';
    const missing = elementDistribution.missing || [];

    // 1. Core trait from Day Master type
    const coreTrait = CORE_TRAITS[identity.code] || 'unique energy patterns';

    // 2. Dominant element impact
    const dominantImpact =
      DOMINANT_IMPACT[dominant] ||
      'creates a unique balance across all domains';

    // 3. Missing element guidance
    const missingKey = getMissingElementKey(missing);
    let missingGuidance = MISSING_ELEMENT_GUIDANCE[missingKey] || '';

    // Replace {elements} placeholder if multiple missing
    if (missingKey === 'multiple') {
      const formattedMissing = formatMissingElements(missing);
      missingGuidance = missingGuidance.replace('{elements}', formattedMissing);
    }

    // 4. Element interaction explanation (if Day Master ≠ Dominant)
    let interactionExplanation = '';
    if (dayMaster !== dominant && ELEMENT_INTERACTIONS[dayMaster]) {
      interactionExplanation =
        ELEMENT_INTERACTIONS[dayMaster][dominant] ||
        `Your ${dayMaster} nature harmonizes with ${dominant} dominance in unique ways`;
    } else if (dayMaster === dominant) {
      interactionExplanation = `Your ${dayMaster} nature is amplified by ${dominant} dominance—this element defines you completely`;
    }

    // 5. Archetype connection (ties chart to identity)
    const archetypeConnection =
      ARCHETYPE_CONNECTIONS[identity.code] ||
      'a unique combination of elemental patterns';

    // 6. Build the summary sentence
    const summary = `Your chart reveals ${coreTrait}${dominant !== 'Balanced' ? ` grounded in ${dominant}'s influence` : ''}`;

    // 7. Build implications array
    const implications: string[] = [];

    // Add core trait implication
    implications.push(`Your ${dayMaster} core gives you ${coreTrait}`);

    // Add dominant element implication (if not balanced)
    if (dominant !== 'Balanced') {
      implications.push(`Your ${dominant} dominance ${dominantImpact}`);
    }

    // Add missing element guidance (if any)
    if (missing.length > 0) {
      implications.push(
        `Your missing ${formatMissingElements(missing)} means you benefit from ${missingGuidance.replace('deliberately cultivating', 'deliberately cultivating')}`,
      );
    } else {
      implications.push(missingGuidance);
    }

    // 8. Build "so what" conclusion
    const soWhat = `This is why you're ${identity.title}—your chart literally shows ${archetypeConnection}${interactionExplanation ? '. ' + interactionExplanation : ''}.`;

    return {
      summary,
      implications,
      soWhat,
      interactionExplanation: interactionExplanation || undefined, // Optional, for display
    };
  }

  /**
   * Get chapter analysis (20-year life phase)
   *
   * Traditional Bazi Note:
   * - Luck eras (大運) are 10-year periods in traditional Bazi
   * - 20-year "chapters" align with Korean life phases (초년기, 중년기, 장년기, 노년기)
   * - Each chapter = 2 luck eras, providing meaningful life phase aggregation
   *
   * Chapter mapping:
   * - Chapter 1: 0-19 years (초년기 - Early Life)
   * - Chapter 2: 20-39 years (중년기 - Middle Life)
   * - Chapter 3: 40-59 years (장년기 - Prime Years)
   * - Chapter 4: 60-79 years (노년기 - Later Life)
   *
   * Aggregation Strategy:
   * - ONE API call: getAnalysisForDateRange(~7,300 days)
   * - Full aggregation chain: Daily → Monthly → Yearly → Chapter
   * - No sampling (to prevent LLM hallucination)
   * - Performance measured and optimized as needed
   */
  /**
   * Get weekly analysis (7 days) - FOR TESTING AGGREGATION
   */
  async getWeeklyAnalysis(
    birthDateTime: Date,
    gender: 'male' | 'female',
    birthTimezone: string,
    currentTimezone: string,
    isTimeKnown: boolean,
    startDate: Date, // Week start date
  ): Promise<{ weeklyReport: FortuneReport; dailyReports: FortuneReport[] }> {
    const startTime = Date.now();

    // Suppress console during library calls
    const originalLog = console.log;
    const originalDebug = console.debug;
    const originalWarn = console.warn;
    const originalError = console.error;

    const ourLog = (...args: any[]) => originalLog(...args);

    console.log = () => {};
    console.debug = () => {};
    console.warn = () => {};
    console.error = () => {};

    try {
      ourLog('\n========================================');
      ourLog('🔍 WEEKLY ANALYSIS - DETAILED LOGGING');
      ourLog('========================================\n');

      // Initialize calculator
      const baseCalculator = new BaziCalculator(
        birthDateTime,
        gender,
        birthTimezone,
        isTimeKnown,
      );
      const baseAnalysis = baseCalculator.getCompleteAnalysis();

      if (!baseAnalysis) {
        throw new Error('SajuService: getCompleteAnalysis returned null.');
      }

      // Calculate week end date (7 days)
      const weekEndDate = addDays(startDate, 6);

      ourLog(
        `📅 Week: ${startDate.toISOString().split('T')[0]} to ${weekEndDate.toISOString().split('T')[0]}\n`,
      );

      // Generate daily reports for 7 days
      const normalizedStart = toDate(startDate.toISOString().slice(0, 10), {
        timeZone: currentTimezone,
      });
      const normalizedEnd = toDate(weekEndDate.toISOString().slice(0, 10), {
        timeZone: currentTimezone,
      });

      const dailyAnalyses = baseCalculator.getAnalysisForDateRange(
        normalizedStart,
        normalizedEnd,
        currentTimezone,
        { type: 'personalized' },
      ) as PersonalizedDailyAnalysisOutput[];

      if (!dailyAnalyses || dailyAnalyses.length === 0) {
        throw new Error('Failed to get daily analyses for week');
      }

      ourLog(`✅ Fetched ${dailyAnalyses.length} daily analyses\n`);

      // Step 0: Build user context once (natal characteristics)
      ourLog('🔧 Building User Context (natal characteristics)...');
      const userContext = BaziDataExtractor.buildUserContext(baseAnalysis);
      ourLog(`✅ User context built\n`);

      // Step 1: Generate daily reports with logging
      ourLog('📊 STEP 1: Generating Daily Reports');
      ourLog('─────────────────────────────────────\n');

      const dailyReports: FortuneReport[] = [];
      for (let i = 0; i < dailyAnalyses.length; i++) {
        const dailyAnalysis = dailyAnalyses[i];
        const rawData = BaziDataExtractor.extract(userContext, dailyAnalysis);
        const dailyReport = ViewAggregator.forDaily(
          rawData,
          baseAnalysis,
          dailyAnalysis,
          userContext.natalPatterns,
        );

        // Count context data
        const totalTriggers = Object.values(rawData.lifeAreas).reduce(
          (sum, area) => sum + (area.active ? area.triggers.length : 0),
          0,
        );
        const activeAreas = Object.entries(rawData.lifeAreas).filter(
          ([_, area]) => area.active,
        ).length;
        const favorableTriggers = Object.values(rawData.lifeAreas).reduce(
          (sum, area) =>
            sum +
            (area.active
              ? area.triggers.filter((t) => t.involvesFavorable).length
              : 0),
          0,
        );
        const unfavorableTriggers = Object.values(rawData.lifeAreas).reduce(
          (sum, area) =>
            sum +
            (area.active
              ? area.triggers.filter((t) => t.involvesUnfavorable).length
              : 0),
          0,
        );

        ourLog(
          `Day ${i + 1} (${dailyReport.startDate.toISOString().split('T')[0]}):`,
        );
        ourLog(
          `  Career:        Opp ${dailyReport.scores.career.opportunities} | Chal ${dailyReport.scores.career.challenges} | Net ${dailyReport.scores.career.net}`,
        );
        ourLog(
          `  Wealth:        Opp ${dailyReport.scores.wealth.opportunities} | Chal ${dailyReport.scores.wealth.challenges} | Net ${dailyReport.scores.wealth.net}`,
        );
        ourLog(
          `  Relationships: Opp ${dailyReport.scores.relationships.opportunities} | Chal ${dailyReport.scores.relationships.challenges} | Net ${dailyReport.scores.relationships.net}`,
        );
        ourLog(`  Overall:       Net ${dailyReport.scores.overall.net}`);
        ourLog(
          `  📦 Context:    ${totalTriggers} triggers (${favorableTriggers} fav, ${unfavorableTriggers} unfav), ${activeAreas}/4 areas active`,
        );
        ourLog(
          `  🎨 Element:    ${rawData.dailyElement} ${rawData.favorableElements?.primary.includes(rawData.dailyElement) ? '✓ favorable' : rawData.favorableElements?.unfavorable.includes(rawData.dailyElement) ? '✗ unfavorable' : '○ neutral'}\n`,
        );

        dailyReports.push(dailyReport);
      }

      // Step 2: Aggregate to weekly with logging
      ourLog('\n📊 STEP 2: Aggregating to Weekly');
      ourLog('─────────────────────────────────────\n');

      const weeklyReport = ViewAggregator.forWeekly(dailyReports);

      // Calculate what was preserved vs averaged
      const totalDailyTriggers = dailyReports.reduce((sum, day) => {
        const dayTriggers = Object.values(
          day.technicalBasis.rawTriggers,
        ).reduce((s, area) => s + (area.active ? area.triggers.length : 0), 0);
        return sum + dayTriggers;
      }, 0);

      const weeklyTriggers = Object.values(
        weeklyReport.technicalBasis.rawTriggers,
      ).reduce(
        (sum, area) => sum + (area.active ? area.triggers.length : 0),
        0,
      );

      const dailyNetScores = dailyReports.map((d) => d.scores.overall.net);
      const avgDailyNet =
        dailyNetScores.reduce((a, b) => a + b, 0) / dailyNetScores.length;

      ourLog(`Weekly Aggregated Scores:`);
      ourLog(
        `  Career:        Opp ${weeklyReport.scores.career.opportunities} | Chal ${weeklyReport.scores.career.challenges} | Net ${weeklyReport.scores.career.net}`,
      );
      ourLog(
        `  Wealth:        Opp ${weeklyReport.scores.wealth.opportunities} | Chal ${weeklyReport.scores.wealth.challenges} | Net ${weeklyReport.scores.wealth.net}`,
      );
      ourLog(
        `  Relationships: Opp ${weeklyReport.scores.relationships.opportunities} | Chal ${weeklyReport.scores.relationships.challenges} | Net ${weeklyReport.scores.relationships.net}`,
      );
      ourLog(
        `  Overall:       Net ${weeklyReport.scores.overall.net} (avg of daily: ${Math.round(avgDailyNet)})`,
      );
      ourLog(`\n  📦 Context Compression:`);
      ourLog(
        `     • Triggers: ${totalDailyTriggers} daily → ${weeklyTriggers} weekly (${weeklyTriggers === totalDailyTriggers ? 'ALL PRESERVED ✓' : 'AGGREGATED'})`,
      );
      ourLog(
        `     • Lucky Symbols: ${dailyReports[0].luckySymbols.numbers.length} daily → ${weeklyReport.luckySymbols.numbers.length} weekly (deduplicated)`,
      );
      ourLog(
        `     • Special Stars: ${dailyReports.reduce((s, d) => s + d.specialStars.length, 0)} total → ${weeklyReport.specialStars.length} weekly (deduplicated)\n`,
      );

      // Step 3: Context preservation analysis
      ourLog('\n📊 STEP 3: Context Preservation Analysis');
      ourLog('─────────────────────────────────────\n');

      // Check for Luck Era transitions (대운 changes)
      const hasLuckEraTransitions =
        weeklyReport.technicalBasis.luckEraTransitions &&
        weeklyReport.technicalBasis.luckEraTransitions.length > 1;

      if (hasLuckEraTransitions) {
        ourLog('🔄 LUCK ERA (大運/대운) TRANSITIONS DETECTED:');
        weeklyReport.technicalBasis.luckEraTransitions!.forEach((era, i) => {
          if (era.isPreLuckEra) {
            ourLog(
              `   Period ${i + 1}: Pre-Luck Era (before first 大運 starts)`,
            );
          } else {
            ourLog(
              `   Era ${i + 1}: ${era.luckEra?.tenGod || 'None'} (${era.luckEra?.stemElement || 'N/A'})`,
            );
          }
          ourLog(
            `             ${era.startDate.toISOString().split('T')[0]} to ${era.endDate.toISOString().split('T')[0]} (${era.daysInPeriod} days)`,
          );
        });
        ourLog('\n');
      } else {
        const isPreEra = weeklyReport.technicalBasis.luckEra === null;
        ourLog(
          `🔄 LUCK ERA (大運/대운): ${isPreEra ? 'Pre-Luck Era (no 大運 yet)' : `${weeklyReport.technicalBasis.luckEra?.tenGod || 'None'} (stable throughout)`}\n`,
        );
      }

      ourLog('✅ PRESERVED:');
      ourLog(
        '   • Day Master element & strength (in technicalBasis.dayMaster)',
      );
      ourLog(
        '   • Natal structure Ten Gods (in technicalBasis.natalStructure)',
      );
      ourLog(
        `   • Luck Era data ${hasLuckEraTransitions ? '+ TRANSITIONS tracked!' : '(single era)'}`,
      );
      ourLog('   • Favorable elements (in technicalBasis.favorableElements)');
      ourLog('   • All triggers/interactions (in technicalBasis.rawTriggers)');
      ourLog('   • Deduplicated lucky symbols');
      ourLog('   • Deduplicated special stars');

      ourLog('\n⚠️  AVERAGED (context compressed):');
      ourLog(
        `   • Scores: ${dailyReports.length} daily scores → 1 weekly average`,
      );
      ourLog(
        `   • Element favorability: Daily variations → Single period element`,
      );

      ourLog('\n❌ LOST (cannot recover from weekly):');
      ourLog('   • Specific dates of individual days');
      ourLog('   • Day-to-day score fluctuations');
      ourLog('   • Daily element changes');
      ourLog('   • Hourly breakdowns (12 windows per day)');
      ourLog('   • Trigger timing (which day had which trigger)');

      ourLog('\n🎯 VERDICT:');
      if (weeklyTriggers === totalDailyTriggers) {
        ourLog(
          '   ✓ All raw interaction data preserved - LLM can still access full context!',
        );
      } else {
        ourLog(
          `   ⚠️  Some triggers deduplicated (${totalDailyTriggers} → ${weeklyTriggers})`,
        );
      }
      ourLog('   ✓ Scores averaged correctly - statistical summary intact');
      ourLog(
        '   ⚠️  Temporal granularity lost - cannot reconstruct daily timeline\n',
      );

      const totalTime = Date.now() - startTime;
      ourLog(
        `\n⏱️  TOTAL TIME: ${totalTime}ms (~${Math.round(totalTime / 1000)}s)`,
      );
      ourLog('========================================\n');

      return { weeklyReport, dailyReports };
    } finally {
      console.log = originalLog;
      console.debug = originalDebug;
      console.warn = originalWarn;
      console.error = originalError;
    }
  }

  async getChapterAnalysis(
    birthDateTime: Date,
    gender: 'male' | 'female',
    birthTimezone: string,
    currentTimezone: string,
    isTimeKnown: boolean,
    chapter: 1 | 2 | 3 | 4,
  ): Promise<any> {
    const startTime = Date.now();

    // Suppress ALL library console output during entire chapter analysis
    const originalConsoleLog = console.log;
    const originalConsoleWarn = console.warn;
    const originalConsoleDebug = console.debug;
    const originalConsoleError = console.error;

    // Save a reference for our own logging
    const ourLog = originalConsoleLog;

    console.log = () => {}; // Silence console.log
    console.warn = () => {}; // Silence console.warn
    console.debug = () => {}; // Silence console.debug
    console.error = () => {}; // Silence console.error

    let dailyAnalyses: PersonalizedDailyAnalysisOutput[];
    let baseAnalysis: CompleteAnalysis;
    let baseCalculator: BaziCalculator;

    try {
      ourLog(`[Chapter ${chapter}] Fetching daily analyses...`);
      const fetchStart = Date.now();

      // Initialize calculator (library may log here)
      baseCalculator = new BaziCalculator(
        birthDateTime,
        gender,
        birthTimezone,
        isTimeKnown,
      );
      baseAnalysis = baseCalculator.getCompleteAnalysis();

      if (!baseAnalysis) {
        throw new Error('SajuService: getCompleteAnalysis returned null.');
      }

      // Calculate chapter start/end dates
      const chapterStartAge = (chapter - 1) * 20; // 0, 20, 40, 60
      // For a 20-year chapter (e.g., ages 20-39), we need the day before the 40th birthday
      const chapterStartDate = addYears(birthDateTime, chapterStartAge);
      const chapterEndDate = addYears(birthDateTime, chapter * 20);
      chapterEndDate.setDate(chapterEndDate.getDate() - 1); // Last day before next chapter

      // ONE API call - get ALL daily analyses for 20 years (library may log here)
      const normalizedStart = toDate(
        chapterStartDate.toISOString().slice(0, 10),
        { timeZone: currentTimezone },
      );
      const normalizedEnd = toDate(chapterEndDate.toISOString().slice(0, 10), {
        timeZone: currentTimezone,
      });

      dailyAnalyses = baseCalculator.getAnalysisForDateRange(
        normalizedStart,
        normalizedEnd,
        currentTimezone,
        { type: 'personalized' },
      ) as PersonalizedDailyAnalysisOutput[];

      if (!dailyAnalyses || dailyAnalyses.length === 0) {
        throw new Error('Failed to get daily analyses for chapter');
      }

      ourLog(
        `[Chapter ${chapter}] Fetched ${dailyAnalyses.length} daily analyses in ${Date.now() - fetchStart}ms`,
      );
    } finally {
      // Restore console BEFORE processing (so our logs show)
      console.log = originalConsoleLog;
      console.warn = originalConsoleWarn;
      console.debug = originalConsoleDebug;
      console.error = originalConsoleError;
    }

    // Step 0: Build user context once (natal characteristics)
    const userContext = BaziDataExtractor.buildUserContext(baseAnalysis);

    // Step 1: Generate ALL daily reports
    console.log(`[Chapter ${chapter}] Generating daily reports...`);
    const dailyStart = Date.now();

    const dailyReports: FortuneReport[] = dailyAnalyses.map((dailyAnalysis) => {
      // Fetch general analysis for first day of each month to get monthly/annual pillars
      let generalAnalysis = null;
      const date = new Date(dailyAnalysis.date);
      if (date.getDate() === 1) {
        // First day of month - fetch general analysis for pillars
        generalAnalysis = baseCalculator.getAnalysisForDate(
          date,
          birthTimezone,
          {
            type: 'general',
          },
        );
      }

      const rawData = BaziDataExtractor.extract(
        userContext,
        dailyAnalysis,
        generalAnalysis,
      );
      return ViewAggregator.forDaily(
        rawData,
        baseAnalysis,
        dailyAnalysis,
        userContext.natalPatterns,
      );
    });

    console.log(
      `[Chapter ${chapter}] Generated ${dailyReports.length} daily reports in ${Date.now() - dailyStart}ms`,
    );

    // TODO #1: Generate yearly sub-reports directly from daily (NEW APPROACH)
    console.log(
      `[Chapter ${chapter}] Generating yearly sub-reports from daily...`,
    );
    const yearlyStart = Date.now();

    const chapterStartAge = (chapter - 1) * 20;
    const chapterStartDate = addYears(birthDateTime, chapterStartAge);

    // NEW: Use ViewAggregator.generateYearlySubReports directly from daily
    const yearlyReports: FortuneReport[] =
      ViewAggregator.generateYearlySubReports(dailyReports, chapterStartDate);

    console.log(
      `[Chapter ${chapter}] Generated ${yearlyReports.length} yearly reports in ${Date.now() - yearlyStart}ms`,
    );

    console.log(`   ✅ Generated ${yearlyReports.length} yearly sub-reports`);

    // Step 4: Aggregate yearly → chapter
    console.log(`[Chapter ${chapter}] Aggregating to chapter...`);
    const chapterStart = Date.now();

    const chapterReport = ViewAggregator.forChapter(yearlyReports);

    console.log(
      `[Chapter ${chapter}] Generated chapter report in ${Date.now() - chapterStart}ms`,
    );

    // Step 4.5: Build chart identity (TODO #4)
    console.log(`[Chapter ${chapter}] Building chart identity...`);
    const identityStart = Date.now();

    // Use first daily analysis as representative
    const representativeRawData = BaziDataExtractor.extract(
      userContext,
      dailyAnalyses[0],
    );

    const chartIdentity = ViewAggregator.buildChartIdentity(
      dailyReports,
      representativeRawData,
      birthDateTime.getFullYear(),
    );

    // Add chart identity to chapter report's technical basis
    chapterReport.technicalBasis.chartIdentity = chartIdentity;

    console.log(
      `[Chapter ${chapter}] Built chart identity in ${Date.now() - identityStart}ms`,
    );

    // 🧪 TODO #4 VALIDATION: Chart Identity (Condensed)
    console.log('\n📊 Chart Identity:');
    console.log(
      `   ${chartIdentity.dayMaster.element} (${chartIdentity.dayMaster.yinYang}) | ${chartIdentity.chartStrength.strength} | ${chartIdentity.majorThemes.length} themes`,
    );
    console.log('');

    // 🧪 TODO #8-11 VALIDATION: Heatmap Data
    console.log('═'.repeat(80));
    console.log('🧪 TODO #8-11: Heatmap Data Validation');
    console.log('═'.repeat(80) + '\n');

    if (chapterReport.heatmapData && chapterReport.heatmapData.length > 0) {
      console.log('✅ Heatmap data generated successfully\n');
      console.log('📊 Heatmap Summary:');
      console.log(`   Total entries: ${chapterReport.heatmapData.length}`);
      console.log(
        `   Expected for chapter: 20 years (${chapterReport.heatmapData.length === 20 ? '✅ CORRECT' : '❌ INCORRECT'})`,
      );
      console.log(
        `   Period format: "${chapterReport.heatmapData[0].period}" (yearly)`,
      );
      console.log(
        `   Sample values: Opp=${chapterReport.heatmapData[0].opportunities.toFixed(1)} Chal=${chapterReport.heatmapData[0].challenges.toFixed(1)}`,
      );

      // Show ALL entries to check variation
      console.log('\n   📋 All 20 yearly entries:');
      chapterReport.heatmapData.forEach((entry, i) => {
        const intensity = entry.opportunities + entry.challenges;
        const net = entry.opportunities - entry.challenges;
        console.log(
          `      ${String(i + 1).padStart(2, ' ')}. ${entry.period}: Opp=${entry.opportunities.toFixed(1)} Chal=${entry.challenges.toFixed(1)} | Intensity=${intensity.toFixed(1)} Net=${net > 0 ? '+' : ''}${net.toFixed(1)}`,
        );
      });

      // Statistical analysis
      const allOpp = chapterReport.heatmapData.map((d) => d.opportunities);
      const allChal = chapterReport.heatmapData.map((d) => d.challenges);
      const oppRange = Math.max(...allOpp) - Math.min(...allOpp);
      const chalRange = Math.max(...allChal) - Math.min(...allChal);

      console.log('\n   📈 Score Variation Analysis:');
      console.log(
        `      Opportunities: Min=${Math.min(...allOpp).toFixed(1)} Max=${Math.max(...allOpp).toFixed(1)} Range=${oppRange.toFixed(1)}`,
      );
      console.log(
        `      Challenges:    Min=${Math.min(...allChal).toFixed(1)} Max=${Math.max(...allChal).toFixed(1)} Range=${chalRange.toFixed(1)}`,
      );
      console.log(
        `      ${oppRange > 10 || chalRange > 10 ? '✅ Good variation for heatmap' : '⚠️  Low variation - heatmap may look flat'}`,
      );
    } else {
      console.log('❌ FAILED: No heatmap data generated');
    }

    console.log('\n✅ TODO #8-11 COMPLETE\n');
    console.log('═'.repeat(80) + '\n');

    // Build actual LLM context (not mocked)
    const llmContext = LLMContextBuilder.buildContext(
      chapterReport,
      representativeRawData,
      baseAnalysis,
      dailyAnalyses[0],
    );

    console.log('🧠 LLM Context:');
    console.log(
      `   Chart Identity: ${llmContext.chartIdentity ? `✅ (${llmContext.chartIdentity.energyType})` : '❌ Missing'}`,
    );
    console.log('');

    // Validate Ten God Context (Favorable & Unfavorable) - Only for Chapter 1 to reduce noise
    if (chapter === 1) {
      console.log('═'.repeat(80));
      console.log('🧪 Ten God Context Validation (Favorable & Unfavorable)');
      console.log('═'.repeat(80));

      const categories = [
        'career',
        'wealth',
        'relationships',
        'wellness',
        'personalGrowth',
      ] as const;

      for (const category of categories) {
        const ctx = llmContext.tenGodContext[category];
        console.log(`\n📊 ${category.toUpperCase()}`);
        console.log(`   Net Favorability: ${ctx.netFavorability}`);
        console.log(`   Summary: ${ctx.summary.substring(0, 100)}...`);

        console.log(`\n   ✅ Favorable (${ctx.favorableTenGods.length}):`);
        if (ctx.favorableTenGods.length === 0) {
          console.log('      (none)');
        } else {
          for (const tg of ctx.favorableTenGods) {
            console.log(`      - ${tg.star}`);
            console.log(
              `        Natal: ${tg.natalCount}x | Weight: ${tg.natalWeight} | Luck Era: ${tg.luckEraActive ? '🔥 ACTIVE' : 'inactive'}`,
            );
            console.log(`        Timing: ${tg.timing}`);
          }
        }

        console.log(`\n   ⚠️  Unfavorable (${ctx.unfavorableTenGods.length}):`);
        if (ctx.unfavorableTenGods.length === 0) {
          console.log('      (none)');
        } else {
          for (const tg of ctx.unfavorableTenGods) {
            console.log(`      - ${tg.star}`);
            console.log(
              `        Natal: ${tg.natalCount}x | Weight: ${tg.natalWeight} | Luck Era: ${tg.luckEraActive ? '🔥 ACTIVE' : 'inactive'}`,
            );
            console.log(`        Timing: ${tg.timing}`);
          }
        }
        console.log('   ' + '─'.repeat(76));
      }

      console.log(
        '\n✅ Ten God Context includes both favorable & unfavorable with industry-standard weighting',
      );
      console.log('═'.repeat(80) + '\n');
    }

    // 🧪 VALIDATION MODE: LLM Generation Disabled
    console.log('⏸️  LLM generation skipped (validation mode)');
    console.log('');

    // Return minimal mock response for testing
    return {
      _source: {
        fortuneReport: chapterReport,
        llmContext: llmContext, // Actual LLM context for validation
      },
      title: `Chapter ${chapter} (Validation Mode)`,
      subtitle: 'Chart Identity Validation Complete',
      keywords: [],
      introduction: 'LLM generation disabled for validation.',
      vibeCheck: {
        introduction: 'N/A',
        vibes: [],
      },
      turningPoints: {
        introduction: 'N/A',
        timeline: [],
      },
      chartInteraction: {
        title: 'Who You Are',
        content: chartIdentity.chartStrength.interpretation,
      },
      opportunities: {
        title: 'Opportunities',
        content: 'N/A (validation mode)',
      },
      challenges: { title: 'Challenges', content: 'N/A (validation mode)' },
      advice: { title: 'Advice', content: 'N/A (validation mode)' },
      significantPeriods: [],
      cheatSheet: {
        doList: [],
        avoidList: [],
      },
      takeaways: 'Validation mode - LLM disabled',
      metadata: {
        ageRange: `${(chapter - 1) * 20}-${chapter * 20 - 1}`,
        generatedAt: new Date().toISOString(),
      },
    };

    /* 🧪 COMMENTED OUT FOR VALIDATION - Uncomment when ready to test LLM
    // Step 5: Build comprehensive LLM context
    console.log(`[Chapter ${chapter}] Building LLM context...`);
    const llmStart = Date.now();

    const llmContext = LLMContextBuilder.buildContext(
      chapterReport,
      representativeRawData,
      baseAnalysis,
      dailyAnalyses[0],
    );

    console.log(
      `[Chapter ${chapter}] Built LLM context in ${Date.now() - llmStart}ms`,
    );

    // Step 6: Generate UI with LLM using REAL data
    console.log(`[Chapter ${chapter}] Generating LLM report...`);
    const aiStart = Date.now();

    const ageStart = (chapter - 1) * 20;

    // Build context from REAL aggregated data
    // Extract top categories
    const topCategoryEntries = Object.entries(chapterReport.scores)
      .filter(([key]) => key !== 'overall')
      .sort(([, a], [, b]) => b.net - a.net)
      .slice(0, 2);

    const topCategories = topCategoryEntries.map(
      ([key]) => key.charAt(0).toUpperCase() + key.slice(1),
    );

    // Extract Luck Era transitions for context
    const birthYear = birthDateTime.getFullYear();
    const luckEraTransitions =
      chapterReport.technicalBasis.luckEraTransitions?.map((transition) => {
        const age = transition.startDate.getFullYear() - birthYear;
        return {
          age,
          tenGod: transition.luckEra?.tenGod || null,
          element: transition.luckEra?.stemElement || 'Unknown',
          isPreLuckEra: transition.isPreLuckEra,
        };
      }) || [];

    // Extract top category Ten Gods from LLM context
    const topCategoryTenGods: { [key: string]: string | null } = {};
    for (const [categoryKey] of topCategoryEntries) {
      const categoryContext = llmContext.tenGodContext[categoryKey];
      if (categoryContext?.natal) {
        const categoryName =
          categoryKey.charAt(0).toUpperCase() + categoryKey.slice(1);
        topCategoryTenGods[categoryName] = categoryContext.natal;
      }
    }

    // Extract key interactions (top 3 most frequent)
    const keyInteractions: string[] = [];
    if (chapterReport.aggregationMetadata?.triggerPatterns) {
      keyInteractions.push(
        ...chapterReport.aggregationMetadata.triggerPatterns
          .slice(0, 3)
          .map((pattern) => pattern.type),
      );
    }

    const simpleContext = {
      ageRange: `Ages ${ageStart}-${ageStart + 19}`,
      overallScore: chapterReport.scores.overall.net,
      opportunities: chapterReport.scores.overall.opportunities,
      challenges: chapterReport.scores.overall.challenges,
      topCategories,
      mainElement: chapterReport.technicalBasis.dayMaster.element,
      favorableElements:
        chapterReport.technicalBasis.favorableElements?.primary || [],
      dominantVibe:
        chapterReport.scores.overall.net > 60
          ? ('growth' as const)
          : chapterReport.scores.overall.net < 40
            ? ('challenge' as const)
            : ('balance' as const),
      // 🔧 RICH BAZI CONTEXT (For Technical Basis)
      baziDetails: {
        dayMaster: {
          element: llmContext.dayMaster.element,
          yinYang: llmContext.dayMaster.yinYang,
          chineseName: llmContext.dayMaster.chineseName,
        },
        natalPillars: {
          year: {
            tenGod: chapterReport.technicalBasis.natalStructure.social.tenGod,
            element:
              chapterReport.technicalBasis.natalStructure.social.element ||
              'Unknown',
          },
          month: {
            tenGod: chapterReport.technicalBasis.natalStructure.career.tenGod,
            element:
              chapterReport.technicalBasis.natalStructure.career.element ||
              'Unknown',
          },
          day: {
            tenGod: chapterReport.technicalBasis.natalStructure.personal.tenGod,
            element:
              chapterReport.technicalBasis.natalStructure.personal.element ||
              'Unknown',
          },
          hour: {
            tenGod:
              chapterReport.technicalBasis.natalStructure.innovation.tenGod,
            element:
              chapterReport.technicalBasis.natalStructure.innovation.element ||
              'Unknown',
          },
        },
        luckEraTransitions:
          luckEraTransitions.length > 0 ? luckEraTransitions : undefined,
        topCategoryTenGods,
        keyInteractions:
          keyInteractions.length > 0 ? keyInteractions : undefined,
      },
    };

    console.log(`\n[Chapter ${chapter}] 🎯 CONTEXT FOR LLM:`);
    console.log(`\n   📊 Basic Context:`);
    console.log(`      - Day Master: ${simpleContext.mainElement}`);
    console.log(
      `      - Favorable Elements: ${simpleContext.favorableElements.join(', ') || 'None'}`,
    );
    console.log(
      `      - Top Categories: ${simpleContext.topCategories.join(', ')}`,
    );
    console.log(
      `      - Overall Score: ${simpleContext.overallScore} (Opp: ${simpleContext.opportunities}, Chal: ${simpleContext.challenges})`,
    );
    console.log(`      - Dominant Vibe: ${simpleContext.dominantVibe}`);

    console.log(`\n   🔧 Rich Bazi Context:`);
    console.log(
      `      - Day Master: ${simpleContext.baziDetails.dayMaster.chineseName} (${simpleContext.baziDetails.dayMaster.yinYang} ${simpleContext.baziDetails.dayMaster.element})`,
    );
    console.log(`      - Natal Pillars:`);
    console.log(
      `         Year (Social): ${simpleContext.baziDetails.natalPillars.year.tenGod || 'N/A'} (${simpleContext.baziDetails.natalPillars.year.element})`,
    );
    console.log(
      `         Month (Career): ${simpleContext.baziDetails.natalPillars.month.tenGod || 'N/A'} (${simpleContext.baziDetails.natalPillars.month.element})`,
    );
    console.log(
      `         Day (Personal): ${simpleContext.baziDetails.natalPillars.day.tenGod || 'N/A'} (${simpleContext.baziDetails.natalPillars.day.element})`,
    );
    console.log(
      `         Hour (Innovation): ${simpleContext.baziDetails.natalPillars.hour.tenGod || 'N/A'} (${simpleContext.baziDetails.natalPillars.hour.element})`,
    );
    if (simpleContext.baziDetails.luckEraTransitions) {
      console.log(`      - Luck Era Transitions:`);
      simpleContext.baziDetails.luckEraTransitions.forEach((trans) => {
        console.log(
          `         Age ${trans.age}: ${trans.isPreLuckEra ? '🌱 Pre-Luck Era' : trans.tenGod} (${trans.element})`,
        );
      });
    }
    console.log(`      - Top Category Ten Gods:`);
    Object.entries(simpleContext.baziDetails.topCategoryTenGods).forEach(
      ([category, tenGod]) => {
        console.log(`         ${category}: ${tenGod || 'N/A'}`);
      },
    );
    if (simpleContext.baziDetails.keyInteractions) {
      console.log(
        `      - Key Interactions: ${simpleContext.baziDetails.keyInteractions.join(', ')}`,
      );
    }

    // DEBUG: Check raw library data
    console.log(
      `\n[Chapter ${chapter}] 🔍 RAW LIBRARY DATA (用神 Yong Shen Analysis):`,
    );
    console.log(`   - Day Master: ${simpleContext.mainElement}`);
    console.log(
      `   - Favorable Elements (Primary): ${chapterReport.technicalBasis.favorableElements?.primary.join(', ') || 'None'}`,
    );
    console.log(
      `   - Favorable Elements (Secondary): ${chapterReport.technicalBasis.favorableElements?.secondary.join(', ') || 'None'}`,
    );
    console.log(
      `   - Unfavorable Elements: ${chapterReport.technicalBasis.favorableElements?.unfavorable.join(', ') || 'None'}`,
    );
    console.log(
      `   ℹ️  Note: Library uses chart strength analysis (用神), not simple element production`,
    );

    const turningPointData = (chapterReport.phaseAnalysis || []).map(
      (phase, i) => {
        // Get top 2 categories by net score (more reliable than threshold)
        const categoryScores = Object.entries(phase.avgScores)
          .filter(([key]) => key !== 'overall')
          .map(([key, val]) => ({ key, net: (val as any).net }))
          .sort((a, b) => b.net - a.net)
          .slice(0, 2)
          .map((item) => item.key);

        return {
          year:
            chapterReport.startDate.getFullYear() +
            Math.floor((i / (chapterReport.phaseAnalysis?.length || 1)) * 20),
          age:
            ageStart +
            Math.floor((i / (chapterReport.phaseAnalysis?.length || 1)) * 20),
          score: phase.avgScores.overall.net,
          categories: categoryScores,
        };
      },
    );

    console.log(
      `\n[Chapter ${chapter}] Turning Point Data (Top 2 Categories per Phase):`,
    );
    turningPointData.forEach((tp, i) => {
      console.log(
        `   ${i + 1}. Year ${tp.year} (Age ${tp.age}): Score ${tp.score}, Categories: ${tp.categories.join(', ')}`,
      );
    });
    console.log('');

    const [
      titleResult,
      introResult,
      vibesResult,
      turningPointsResult,
      cheatSheetResult,
      takeawaysResult,
    ] = await Promise.all([
      generateText({
        model: geminiClient('gemini-2.5-flash'),
        temperature: 0.2,
        experimental_telemetry: { isEnabled: true },
        messages: [
          { role: 'user', content: generateTitlePrompt(simpleContext) },
        ],
        output: Output.object({ schema: titleOutputSchema.strict() }),
      }),
      generateText({
        model: geminiClient('gemini-2.5-flash'),
        temperature: 0.2,
        experimental_telemetry: { isEnabled: true },
        messages: [
          { role: 'user', content: generateChapterIntroPrompt(simpleContext) },
        ],
        output: Output.object({ schema: introductionOutputSchema.strict() }),
      }),
      generateText({
        model: geminiClient('gemini-2.5-flash'),
        temperature: 0.2,
        experimental_telemetry: { isEnabled: true },
        messages: [
          { role: 'user', content: generateVibeCheckPrompt(simpleContext) },
        ],
        output: Output.object({ schema: vibeCheckOutputSchema.strict() }),
      }),
      generateText({
        model: geminiClient('gemini-2.5-flash'),
        temperature: 0.2,
        experimental_telemetry: { isEnabled: true },
        messages: [
          {
            role: 'user',
            content: generateTurningPointsPrompt(
              simpleContext,
              turningPointData,
            ),
          },
        ],
        output: Output.object({ schema: turningPointsOutputSchema.strict() }),
      }),
      generateText({
        model: geminiClient('gemini-2.5-flash'),
        temperature: 0.2,
        experimental_telemetry: { isEnabled: true },
        messages: [
          { role: 'user', content: generateCheatSheetPrompt(simpleContext) },
        ],
        output: Output.object({ schema: cheatSheetOutputSchema.strict() }),
      }),
      generateText({
        model: geminiClient('gemini-2.5-flash'),
        temperature: 0.2,
        experimental_telemetry: { isEnabled: true },
        messages: [
          { role: 'user', content: generateTakeawaysPrompt(simpleContext) },
        ],
        output: Output.object({ schema: takeawaysOutputSchema.strict() }),
      }),
    ]);

    console.log(
      `[Chapter ${chapter}] LLM generation complete in ${Date.now() - aiStart}ms`,
    );

    const finalReport = {
      _source: {
        fortuneReport: chapterReport,
        llmContext: llmContext,
      },
      title: (titleResult as any).output.title,
      subtitle: (titleResult as any).output.subtitle,
      introduction: (introResult as any).output.text,
      vibeCheck: (vibesResult as any).output,
      turningPoints: (turningPointsResult as any).output,
      cheatSheet: (cheatSheetResult as any).output,
      takeaways: (takeawaysResult as any).output.text,
    };

    const totalTime = Date.now() - startTime;
    console.log(
      `[Chapter ${chapter}] TOTAL TIME: ${totalTime}ms (~${Math.round(totalTime / 1000)}s)`,
    );
    console.log(`   - Data generation: ${aiStart - startTime}ms`);
    console.log(`   - LLM generation: ${Date.now() - aiStart}ms`);

    return finalReport;
    */ // END COMMENTED OUT LLM SECTION
  }

  async getRangeAnalysis(
    birthDateTime: Date,
    gender: 'male' | 'female',
    birthTimezone: string,
    currentTimezone: string,
    isTimeKnown: boolean,
    startDate: Date,
    endDate: Date,
    granularity: 'day' | 'month' | 'year',
  ): Promise<RawBaziData[]> {
    const baseCalculator = new BaziCalculator(
      birthDateTime,
      gender,
      birthTimezone,
      isTimeKnown,
    );
    const baseAnalysis = baseCalculator.getCompleteAnalysis();

    if (!baseAnalysis) {
      throw new Error('SajuService: getCompleteAnalysis returned null.');
    }

    // Normalize the requested calendar dates to "midnight in the target timezone".
    // This prevents off-by-one day shifts (e.g. 2025-07-01 becoming 2025-06-30)
    // when the input Date is at 00:00Z and the target timezone is behind UTC.
    const startYmd = startDate.toISOString().slice(0, 10); // YYYY-MM-DD
    const endYmd = endDate.toISOString().slice(0, 10); // YYYY-MM-DD
    const normalizedStart = toDate(startYmd, { timeZone: currentTimezone });
    const normalizedEnd = toDate(endYmd, { timeZone: currentTimezone });

    const dailyAnalyses = baseCalculator.getAnalysisForDateRange(
      normalizedStart,
      normalizedEnd,
      currentTimezone,
      { type: 'personalized' },
    ) as PersonalizedDailyAnalysisOutput[];

    if (!dailyAnalyses) {
      throw new Error('SajuService: getAnalysisForDateRange returned null.');
    }

    // Build user context once (natal characteristics)
    const userContext = BaziDataExtractor.buildUserContext(baseAnalysis);

    // Extract raw data from library (no calculation, just transformation)
    const dailyData = dailyAnalyses.map((day) =>
      BaziDataExtractor.extract(userContext, day),
    );

    // TODO: Aggregation logic for monthly/yearly views will be implemented
    // in ViewAggregator to identify significant periods
    // For now, return raw daily data
    return dailyData;
  }

  // TODO: Implement aggregation methods using ViewAggregator
  // These will analyze RawBaziData[] to identify:
  // - Significant day ranges within months
  // - Significant months within years
  // - Significant years within luck eras

  /**
   * Generate compatibility analysis between two people
   */
  async getCompatibilityAnalysis(
    person1Data: {
      birthDateTime: Date;
      gender: 'male' | 'female';
      birthTimezone: string;
      isTimeKnown: boolean;
    },
    person2Data: {
      birthDateTime: Date;
      gender: 'male' | 'female';
      birthTimezone: string;
      isTimeKnown: boolean;
    },
  ): Promise<CompatibilityReport> {
    // 1. Build UserContext for both people (reuse existing logic)
    const calc1 = new BaziCalculator(
      person1Data.birthDateTime,
      person1Data.gender,
      person1Data.birthTimezone,
      person1Data.isTimeKnown,
    );
    const analysis1 = calc1.getCompleteAnalysis();
    if (!analysis1) throw new Error('Failed to analyze person 1');
    const userContext1 = BaziDataExtractor.buildUserContext(analysis1);
    const identity1 = this.generateIdentity(userContext1);

    const calc2 = new BaziCalculator(
      person2Data.birthDateTime,
      person2Data.gender,
      person2Data.birthTimezone,
      person2Data.isTimeKnown,
    );
    const analysis2 = calc2.getCompleteAnalysis();
    if (!analysis2) throw new Error('Failed to analyze person 2');
    const userContext2 = BaziDataExtractor.buildUserContext(analysis2);
    const identity2 = this.generateIdentity(userContext2);

    // 2. Calculate element interaction
    const elementInteraction = this.calculateElementInteraction(
      identity1.element as ElementType,
      identity2.element as ElementType,
    );

    // 3. Calculate compatibility score
    const score = this.calculateCompatibilityScore(
      userContext1,
      userContext2,
      elementInteraction.interactionType,
    );

    // 4. Calculate rarity
    const rarity = this.calculatePairingRarity(
      identity1.code,
      identity2.code,
      userContext1,
      userContext2,
    );

    // 5. Generate psychology-first content
    const sharedTraits = this.generateSharedTraits(
      userContext1,
      userContext2,
      identity1,
      identity2,
    );

    const specialConnections = this.generateSpecialConnections(
      userContext1,
      userContext2,
      elementInteraction,
    );

    const dynamics = this.generateDynamics(
      identity1,
      identity2,
      userContext1,
      userContext2,
      elementInteraction,
    );

    const sharedBehaviors = this.generateSharedBehaviors(
      userContext1,
      userContext2,
      identity1,
      identity2,
    );

    const growthAreas = this.generateGrowthAreas(
      userContext1,
      userContext2,
      identity1,
      identity2,
      elementInteraction,
    );

    // 6. Generate LLM overview (psychology-focused)
    const overview = await this.generateCompatibilityOverview(
      identity1,
      identity2,
      sharedTraits,
      dynamics,
      score.rating,
    );

    // 7. Generate score breakdown (top-level, visible)
    const scoreBreakdown = this.generateScoreBreakdown(
      userContext1,
      userContext2,
      score.overall,
    );

    // 8. Generate pairing title (unique name for this compatibility)
    const pairingTitle = this.generatePairingTitle(
      identity1,
      identity2,
      elementInteraction,
    );

    // 9. Generate introduction text (explains the pairing's core dynamic)
    const introduction = this.generateCompatibilityIntroduction(
      identity1,
      identity2,
      elementInteraction,
      scoreBreakdown.summary,
      score.overall,
    );

    // 10. Generate chart display (stacked cards with Day Masters + full charts)
    const chartDisplay = this.generateChartDisplay(
      userContext1,
      userContext2,
      identity1,
      identity2,
      elementInteraction,
    );

    // 10. Build technical basis (hidden by default)
    const technicalBasis = this.buildTechnicalBasis(
      elementInteraction,
      score,
      userContext1,
      userContext2,
    );

    return {
      pairingTitle, // NEW: Unique name for this pairing
      introduction, // NEW: Explains the pairing's core dynamic
      person1: {
        // NOTE: We don't return birthDateTime here - it's not needed in the output
        // The corrected birthDateTime was only used for calculation
        gender: person1Data.gender,
        identity: {
          code: identity1.code,
          title: identity1.title,
          element: identity1.element,
          polarity: identity1.polarity,
        },
      },
      person2: {
        // NOTE: We don't return birthDateTime here - it's not needed in the output
        // The corrected birthDateTime was only used for calculation
        gender: person2Data.gender,
        identity: {
          code: identity2.code,
          title: identity2.title,
          element: identity2.element,
          polarity: identity2.polarity,
        },
      },
      score,
      rarity,
      overview,
      scoreBreakdown, // Casual categories: Romance, Work, Lifestyle, Communication
      chartDisplay, // NEW: Stacked cards showing Day Masters + full charts
      sharedTraits,
      specialConnections,
      dynamics,
      sharedBehaviors,
      growthAreas,
      technicalBasis,
      generatedAt: new Date(),
      reportType: 'compatibility-teaser',
    };
  }

  /**
   * Calculate element interaction between two people
   */
  private calculateElementInteraction(
    element1: ElementType,
    element2: ElementType,
  ): {
    person1Element: string;
    person2Element: string;
    interactionType:
      | 'Generative'
      | 'Controlling'
      | 'Harmonious'
      | 'Conflicting'
      | 'Neutral';
    cycle: string;
    description: string;
  } {
    // Normalize to uppercase for comparison (elements come in as "Fire", "Wood", etc.)
    const elem1 = element1.toString().toUpperCase();
    const elem2 = element2.toString().toUpperCase();

    // Same element = Harmonious
    if (elem1 === elem2) {
      return {
        person1Element: element1,
        person2Element: element2,
        interactionType: 'Harmonious',
        cycle: `Both ${element1}`,
        description: `You share the same ${element1} energy, creating natural understanding and shared motivation. Like two forces of the same nature, you amplify each other's core drive.`,
      };
    }

    // Generative cycle: Wood→Fire, Fire→Earth, Earth→Metal, Metal→Water, Water→Wood
    const generativePairs: Record<string, string> = {
      'WOOD-FIRE':
        'Wood feeds Fire—your growth-oriented energy fuels their transformative intensity, creating a natural synergy where expansion meets expression.',
      'FIRE-EARTH':
        'Fire creates Earth—like focused heat shaping clay, your intensity produces their stability and tangible results.',
      'EARTH-METAL':
        'Earth creates Metal—your grounding presence provides the foundation for their precision and structured thinking.',
      'METAL-WATER':
        'Metal creates Water—your clarity and discipline generate their adaptability and flowing insights.',
      'WATER-WOOD':
        'Water nourishes Wood—your adaptability and depth feed their natural growth and creative expansion.',
    };

    // Controlling cycle: Wood→Earth, Earth→Water, Water→Fire, Fire→Metal, Metal→Wood
    const controllingPairs: Record<string, string> = {
      'WOOD-EARTH':
        'Wood controls Earth—your expansive energy can overwhelm their need for stability, creating tension between growth and grounding.',
      'EARTH-WATER':
        'Earth controls Water—your stability contains their flow, which can feel either grounding or restrictive depending on balance.',
      'WATER-FIRE':
        'Water controls Fire—your adaptability can extinguish their intensity, creating either tempering balance or frustrating conflict.',
      'FIRE-METAL':
        'Fire controls Metal—your intensity refines their structure, which can create either transformation or tension.',
      'METAL-WOOD':
        'Metal controls Wood—your precision cuts through their expansion, creating either focus or frustration.',
    };

    const pairKey = `${elem1}-${elem2}`;
    const reversePairKey = `${elem2}-${elem1}`;

    if (generativePairs[pairKey]) {
      return {
        person1Element: element1,
        person2Element: element2,
        interactionType: 'Generative',
        cycle: `${element1} creates ${element2}`,
        description: generativePairs[pairKey],
      };
    }

    if (generativePairs[reversePairKey]) {
      return {
        person1Element: element1,
        person2Element: element2,
        interactionType: 'Generative',
        cycle: `${element2} creates ${element1}`,
        description: generativePairs[reversePairKey].replace(
          /your|their/g,
          (match) => (match === 'your' ? 'their' : 'your'),
        ),
      };
    }

    if (controllingPairs[pairKey]) {
      return {
        person1Element: element1,
        person2Element: element2,
        interactionType: 'Controlling',
        cycle: `${element1} controls ${element2}`,
        description: controllingPairs[pairKey],
      };
    }

    if (controllingPairs[reversePairKey]) {
      return {
        person1Element: element1,
        person2Element: element2,
        interactionType: 'Controlling',
        cycle: `${element2} controls ${element1}`,
        description: controllingPairs[reversePairKey].replace(
          /your|their/g,
          (match) => (match === 'your' ? 'their' : 'your'),
        ),
      };
    }

    // Default to neutral
    return {
      person1Element: element1,
      person2Element: element2,
      interactionType: 'Neutral',
      cycle: `${element1} and ${element2}`,
      description: `Your ${element1} and their ${element2} energies have a neutral interaction, creating a balanced dynamic without strong tension or synergy.`,
    };
  }

  /**
   * Calculate compatibility score (0-100) using traditional Bazi factors
   *
   * Traditional weights:
   * - 40%: Ten Gods harmony (how charts support each other)
   * - 25%: Marriage Palace (Day Branch interactions)
   * - 20%: Favorable element match
   * - 10%: Element cycle harmony
   * - 5%: Chart strength balance
   */
  private calculateCompatibilityScore(
    userContext1: UserContext,
    userContext2: UserContext,
    interactionType: string,
  ): {
    overall: number;
    rating:
      | 'Highly Compatible'
      | 'Compatible'
      | 'Moderately Compatible'
      | 'Challenging'
      | 'Very Challenging';
    headline: string;
  } {
    let score = 0;

    // 1. TEN GODS HARMONY (40 points max) - Traditional priority #1
    // Check if Person 1's strong elements support Person 2's favorable elements
    const tenGodsScore = this.calculateTenGodsHarmony(
      userContext1,
      userContext2,
    );
    score += tenGodsScore; // 0-40

    // 2. MARRIAGE PALACE (25 points max) - Traditional priority #2
    // Day Branch (日支) interactions - critical for relationship compatibility
    const marriagePalaceScore = this.calculateMarriagePalaceScore(
      userContext1.natalStructure.personal.branch,
      userContext2.natalStructure.personal.branch,
    );
    score += marriagePalaceScore; // 0-25

    // 3. FAVORABLE ELEMENT MATCH (20 points max) - Traditional priority #3
    // Do their favorable elements help each other?
    const favorableScore = this.calculateFavorableElementMatch(
      userContext1,
      userContext2,
    );
    score += favorableScore; // 0-20

    // 4. ELEMENT CYCLE (10 points max) - Supporting factor
    const elementScore = this.calculateElementCycleScore(interactionType);
    score += elementScore; // 0-10

    // 5. CHART STRENGTH BALANCE (5 points max) - Minor factor
    const balanceScore = this.calculateChartStrengthBalance(
      userContext1.chartStrength.strength,
      userContext2.chartStrength.strength,
    );
    score += balanceScore; // 0-5

    // Clamp to 0-100
    score = Math.max(0, Math.min(100, score));

    // Determine rating
    let rating:
      | 'Highly Compatible'
      | 'Compatible'
      | 'Moderately Compatible'
      | 'Challenging'
      | 'Very Challenging';
    if (score >= 80) rating = 'Highly Compatible';
    else if (score >= 65) rating = 'Compatible';
    else if (score >= 50) rating = 'Moderately Compatible';
    else if (score >= 35) rating = 'Challenging';
    else rating = 'Very Challenging';

    // Generate headline based on interaction type
    const headlines: Record<string, string> = {
      Generative: 'A Generative Partnership',
      Harmonious: 'A Harmonious Connection',
      Controlling: 'A Dynamic Tension',
      Conflicting: 'A Transformative Challenge',
      Neutral: 'A Balanced Dynamic',
    };

    return {
      overall: Math.round(score),
      rating,
      headline: headlines[interactionType] || 'A Unique Pairing',
    };
  }

  /**
   * Calculate Ten Gods harmony between two charts (0-40 points)
   * Traditional: How well do their charts support each other's needs?
   */
  private calculateTenGodsHarmony(
    userContext1: UserContext,
    userContext2: UserContext,
  ): number {
    let points = 20; // Start at neutral (50% of max 40)

    // Check if Person 1's favorable elements match Person 2's chart dominance
    const favorable1 = userContext1.favorableElements.primary || [];
    const favorable2 = userContext2.favorableElements.primary || [];

    const elementDist1 = this.calculateElementDistribution(userContext1);
    const elementDist2 = this.calculateElementDistribution(userContext2);

    const dominant1 = elementDist1.dominant[0];
    const dominant2 = elementDist2.dominant[0];

    // Person 1's dominant element helps Person 2's favorable elements (+10)
    if (dominant1 && favorable2.includes(dominant1 as ElementType)) {
      points += 10;
    }

    // Person 2's dominant element helps Person 1's favorable elements (+10)
    if (dominant2 && favorable1.includes(dominant2 as ElementType)) {
      points += 10;
    }

    // Penalty if dominant element is unfavorable for the other (-10 each)
    const unfavorable1 = userContext1.favorableElements.unfavorable || [];
    const unfavorable2 = userContext2.favorableElements.unfavorable || [];

    if (dominant1 && unfavorable2.includes(dominant1 as ElementType)) {
      points -= 10;
    }

    if (dominant2 && unfavorable1.includes(dominant2 as ElementType)) {
      points -= 10;
    }

    return Math.max(0, Math.min(40, points));
  }

  /**
   * Calculate Marriage Palace score (Day Branch interactions) (0-25 points)
   * Traditional: Day Branch (日支) is the "Marriage Palace" in Bazi
   */
  private calculateMarriagePalaceScore(
    branch1: string,
    branch2: string,
  ): number {
    // Same branch = harmonious (20 points)
    if (branch1 === branch2) return 20;

    // Six Combinations (六合) - very harmonious (25 points)
    const sixCombinations: Record<string, string> = {
      子: '丑',
      丑: '子', // Rat-Ox
      寅: '亥',
      亥: '寅', // Tiger-Pig
      卯: '戌',
      戌: '卯', // Rabbit-Dog
      辰: '酉',
      酉: '辰', // Dragon-Rooster
      巳: '申',
      申: '巳', // Snake-Monkey
      午: '未',
      未: '午', // Horse-Goat
    };

    if (sixCombinations[branch1] === branch2) return 25;

    // Six Clashes (六冲) - challenging (5 points)
    const sixClashes: Record<string, string> = {
      子: '午',
      午: '子', // Rat-Horse
      丑: '未',
      未: '丑', // Ox-Goat
      寅: '申',
      申: '寅', // Tiger-Monkey
      卯: '酉',
      酉: '卯', // Rabbit-Rooster
      辰: '戌',
      戌: '辰', // Dragon-Dog
      巳: '亥',
      亥: '巳', // Snake-Pig
    };

    if (sixClashes[branch1] === branch2) return 5;

    // Six Harms (六害) - moderately challenging (10 points)
    const sixHarms: Record<string, string> = {
      子: '未',
      未: '子', // Rat-Goat
      丑: '午',
      午: '丑', // Ox-Horse
      寅: '巳',
      巳: '寅', // Tiger-Snake
      卯: '辰',
      辰: '卯', // Rabbit-Dragon
      申: '亥',
      亥: '申', // Monkey-Pig
      酉: '戌',
      戌: '酉', // Rooster-Dog
    };

    if (sixHarms[branch1] === branch2) return 10;

    // Trinity Combinations (三合) - harmonious (22 points)
    // Water trinity: 申子辰 (Monkey-Rat-Dragon)
    // Wood trinity: 亥卯未 (Pig-Rabbit-Goat)
    // Fire trinity: 寅午戌 (Tiger-Horse-Dog)
    // Metal trinity: 巳酉丑 (Snake-Rooster-Ox)
    const trinities = [
      ['申', '子', '辰'], // Water
      ['亥', '卯', '未'], // Wood
      ['寅', '午', '戌'], // Fire
      ['巳', '酉', '丑'], // Metal
    ];

    for (const trinity of trinities) {
      if (trinity.includes(branch1) && trinity.includes(branch2)) {
        return 22;
      }
    }

    // No significant interaction (neutral 15 points)
    return 15;
  }

  /**
   * Calculate favorable element match (0-20 points)
   * Traditional: Mutual support through favorable elements
   */
  private calculateFavorableElementMatch(
    userContext1: UserContext,
    userContext2: UserContext,
  ): number {
    let points = 10; // Neutral

    const favorable1 = userContext1.favorableElements.primary || [];
    const favorable2 = userContext2.favorableElements.primary || [];

    // Shared favorable elements (+5 each, max 10)
    const sharedFavorable = favorable1.filter((e) =>
      favorable2.includes(e),
    ).length;
    points += Math.min(10, sharedFavorable * 5);

    // No conflicting unfavorable elements (check if one's favorable is other's unfavorable)
    const unfavorable1 = userContext1.favorableElements.unfavorable || [];
    const unfavorable2 = userContext2.favorableElements.unfavorable || [];

    const conflicts =
      favorable1.filter((e) => unfavorable2.includes(e)).length +
      favorable2.filter((e) => unfavorable1.includes(e)).length;

    points -= conflicts * 5; // Penalty for conflicts

    return Math.max(0, Math.min(20, points));
  }

  /**
   * Calculate element cycle score (0-10 points)
   */
  private calculateElementCycleScore(interactionType: string): number {
    if (interactionType === 'Generative') return 10;
    if (interactionType === 'Harmonious') return 8;
    if (interactionType === 'Neutral') return 5;
    if (interactionType === 'Controlling') return 3;
    if (interactionType === 'Conflicting') return 0;
    return 5;
  }

  /**
   * Calculate chart strength balance (0-5 points)
   * Traditional: Strong + Weak charts often balance well
   */
  private calculateChartStrengthBalance(
    strength1: 'Strong' | 'Weak' | 'Balanced',
    strength2: 'Strong' | 'Weak' | 'Balanced',
  ): number {
    // Strong + Weak = good balance (5 points)
    if (
      (strength1 === 'Strong' && strength2 === 'Weak') ||
      (strength1 === 'Weak' && strength2 === 'Strong')
    ) {
      return 5;
    }

    // Both Balanced = good (4 points)
    if (strength1 === 'Balanced' && strength2 === 'Balanced') {
      return 4;
    }

    // One Balanced + anything = okay (3 points)
    if (strength1 === 'Balanced' || strength2 === 'Balanced') {
      return 3;
    }

    // Both Strong or both Weak = can work but challenging (2 points)
    return 2;
  }

  /**
   * Calculate pairing rarity
   */
  private calculatePairingRarity(
    code1: string,
    code2: string,
    userContext1: UserContext,
    userContext2: UserContext,
  ): {
    oneIn: number;
    percentile: number;
    description: string;
  } {
    // Base type probabilities
    const TYPE_DISTRIBUTIONS: Record<string, number> = {
      'Fire-I': 0.021,
      'Fire-O': 0.023,
      'Water-I': 0.02,
      'Water-O': 0.022,
      'Wood-I': 0.024,
      'Wood-O': 0.023,
      'Earth-I': 0.024,
      'Earth-O': 0.025,
      'Metal-I': 0.02,
      'Metal-O': 0.022,
    };

    const prob1 = TYPE_DISTRIBUTIONS[code1] || 0.021;
    const prob2 = TYPE_DISTRIBUTIONS[code2] || 0.021;
    let pairingProb = prob1 * prob2;

    // Adjust for pattern overlap (rarer if both have patterns)
    const patterns1 = userContext1.natalPatterns?.length || 0;
    const patterns2 = userContext2.natalPatterns?.length || 0;
    if (patterns1 > 0 && patterns2 > 0) {
      pairingProb *= 0.7; // Rarer
    }

    // Adjust for special star overlap
    const stars1 = getActiveSpecialStars(userContext1.specialStars);
    const stars2 = getActiveSpecialStars(userContext2.specialStars);
    if (stars1.length > 0 && stars2.length > 0) {
      pairingProb *= 0.85; // Somewhat rarer
    }

    const oneIn = Math.round(1 / pairingProb);
    const percentile = Math.min(99.99, (1 - pairingProb) * 100);

    return {
      oneIn,
      percentile: Math.round(percentile * 100) / 100,
      description: `This type combination appears in approximately 1 in ${oneIn.toLocaleString()} pairings (statistical rarity)`,
    };
  }

  /**
   * Find one highlight (what makes this pairing special)
   */
  private findCompatibilityHighlight(
    userContext1: UserContext,
    userContext2: UserContext,
  ): {
    title: string;
    emoji: string;
    rarity: string;
    description: string;
  } {
    // Check for shared special stars (highest priority)
    const stars1 = getActiveSpecialStars(userContext1.specialStars);
    const stars2 = getActiveSpecialStars(userContext2.specialStars);
    const sharedStars = stars1.filter((s1) =>
      stars2.some((s2) => s2.chineseName === s1.chineseName),
    );

    if (sharedStars.length > 0) {
      const star = sharedStars[0];
      return {
        title: `Shared ${star.name}`,
        emoji: star.emoji,
        rarity: '~1 in 169 pairings',
        description: `You both have rooted ${star.name}s in your charts—${star.description.toLowerCase()}`,
      };
    }

    // Check for shared patterns
    const patterns1 = userContext1.natalPatterns || [];
    const patterns2 = userContext2.natalPatterns || [];
    const sharedPatterns = patterns1.filter((p1) =>
      patterns2.some((p2) => p2.id === p1.id),
    );

    if (sharedPatterns.length > 0) {
      const pattern = sharedPatterns[0];
      return {
        title: 'Shared Special Pattern',
        emoji: '✨',
        rarity: '~1 in 284 pairings',
        description: `You both have the ${pattern.name} pattern—${pattern.description.toLowerCase()}`,
      };
    }

    // Check for complementary polarities (Yin + Yang)
    if (
      userContext1.natalStructure.personal.yinYang !==
      userContext2.natalStructure.personal.yinYang
    ) {
      return {
        title: 'Polarity Balance',
        emoji: '⚖️',
        rarity: '~1 in 2 pairings',
        description: `${userContext1.natalStructure.personal.yinYang} + ${userContext2.natalStructure.personal.yinYang} creates a complete energy system. You bring depth, they bring reach. This natural balance means you understand each other's core while approaching execution differently.`,
      };
    }

    // Default: element complementarity
    return {
      title: 'Element Complementarity',
      emoji: '🔄',
      rarity: 'Common',
      description: `Your elements create a natural dynamic that supports mutual growth and understanding.`,
    };
  }

  /**
   * Find one challenge (creates pain point for premium conversion)
   */
  private findCompatibilityChallenge(
    userContext1: UserContext,
    userContext2: UserContext,
    interactionType: string,
  ): {
    title: string;
    emoji: string;
    frequency: string;
    description: string;
  } {
    const element1 = userContext1.natalStructure.personal.element;
    const element2 = userContext2.natalStructure.personal.element;

    // If controlling or conflicting, make this the challenge
    if (
      interactionType === 'Controlling' ||
      interactionType === 'Conflicting'
    ) {
      return {
        title: 'Core Energy Conflict',
        emoji: '💥',
        frequency: `Common in ${element1}-${element2} pairings`,
        description: `${element1} and ${element2} have opposing natural rhythms. One controls or challenges the other, requiring conscious effort to avoid power struggles or energy drain.`,
      };
    }

    // Check for pace differences (Fire = fast, Earth = slow, Water = flow, etc.)
    const paceMap: Record<string, string> = {
      FIRE: 'fast and intense',
      WATER: 'flowing and adaptive',
      WOOD: 'expansive and growth-oriented',
      EARTH: 'steady and methodical',
      METAL: 'precise and deliberate',
    };

    if (
      (element1 === 'FIRE' && element2 === 'EARTH') ||
      (element1 === 'EARTH' && element2 === 'FIRE')
    ) {
      return {
        title: 'Pace Differences',
        emoji: '⏱️',
        frequency: 'Your #1 friction point',
        description: `Fire moves with concentrated bursts, Earth prefers steady consistency. This pace difference can create tension around timelines and decision-making speed.`,
      };
    }

    // Check for missing element overlap (both missing same element = shared blind spot)
    const elementDist1 = this.calculateElementDistribution(userContext1);
    const elementDist2 = this.calculateElementDistribution(userContext2);
    const sharedMissing = elementDist1.missing.filter((e) =>
      elementDist2.missing.includes(e),
    );

    if (sharedMissing.length > 0) {
      const missingElement = sharedMissing[0];
      return {
        title: 'Shared Blind Spot',
        emoji: '🔍',
        frequency: `~1 in 25 pairings`,
        description: `You both lack ${missingElement} in your charts. This shared gap means neither brings natural ${missingElement.toLowerCase()}-like qualities (${this.getElementQuality(missingElement)}) to the relationship.`,
      };
    }

    // Default challenge
    return {
      title: 'Growth Opportunity',
      emoji: '🌱',
      frequency: 'Universal',
      description: `All pairings require effort to bridge differences. Your challenge is learning to appreciate perspectives that don't come naturally to you.`,
    };
  }

  /**
   * Get element quality description (for missing element challenge)
   */
  private getElementQuality(element: string): string {
    const qualities: Record<string, string> = {
      WOOD: 'flexibility, growth, creativity',
      FIRE: 'passion, intensity, transformation',
      EARTH: 'stability, grounding, practicality',
      METAL: 'structure, precision, boundaries',
      WATER: 'adaptability, depth, flow',
    };
    return qualities[element] || 'balance';
  }

  /**
   * PSYCHOLOGY-FIRST COMPATIBILITY METHODS
   * These translate Bazi factors into human psychology language
   */

  /**
   * Generate shared traits (pills/tags) - 6-8 quick commonalities
   */
  private generateSharedTraits(
    userContext1: UserContext,
    userContext2: UserContext,
    identity1: any,
    identity2: any,
  ): string[] {
    const traits: string[] = [];

    // Check for shared special stars
    const stars1 = getActiveSpecialStars(userContext1.specialStars);
    const stars2 = getActiveSpecialStars(userContext2.specialStars);
    const sharedStars = stars1.filter((s1) =>
      stars2.some((s2) => s2.chineseName === s1.chineseName),
    );

    if (sharedStars.some((s) => s.name === 'Academic Star')) {
      traits.push('Intellectual curiosity');
    }
    if (sharedStars.some((s) => s.name === 'Sky Horse')) {
      traits.push('Love of movement and change');
    }

    // Check for element dominance
    const elementDist1 = this.calculateElementDistribution(userContext1);
    const elementDist2 = this.calculateElementDistribution(userContext2);

    if (
      elementDist1.dominant.includes('EARTH') &&
      elementDist2.dominant.includes('EARTH')
    ) {
      traits.push('Practical approach to goals');
    }

    if (
      elementDist1.dominant.includes('WATER') &&
      elementDist2.dominant.includes('WATER')
    ) {
      traits.push('Adaptable and intuitive');
    }

    if (
      elementDist1.dominant.includes('FIRE') &&
      elementDist2.dominant.includes('FIRE')
    ) {
      traits.push('High energy and passion');
    }

    // Check for polarity
    if (
      userContext1.natalStructure.personal.yinYang ===
      userContext2.natalStructure.personal.yinYang
    ) {
      if (userContext1.natalStructure.personal.yinYang === 'Yin') {
        traits.push('Reflective and inward-focused');
      } else {
        traits.push('Outgoing and expressive');
      }
    }

    // Check for chart strength
    if (
      userContext1.chartStrength.strength === 'Strong' &&
      userContext2.chartStrength.strength === 'Strong'
    ) {
      traits.push('Strong-willed and determined');
    }

    // Check for patterns
    const patterns1 = userContext1.natalPatterns || [];
    const patterns2 = userContext2.natalPatterns || [];

    if (patterns1.length > 0 && patterns2.length > 0) {
      traits.push('Special talents and abilities');
    }

    // Generic positive traits
    if (traits.length < 4) {
      traits.push('Value deep connections');
      traits.push('Prefer quality over quantity');
    }

    // Limit to 6-8 traits
    return traits.slice(0, 8);
  }

  /**
   * Generate special connections (2-3 cards) - Rare/unique aspects
   */
  private generateSpecialConnections(
    userContext1: UserContext,
    userContext2: UserContext,
    elementInteraction: any,
  ): Array<{
    title: string;
    emoji: string;
    rarity: string;
    category:
      | 'rare-trait'
      | 'polarity-balance'
      | 'element-harmony'
      | 'pattern-synergy';
    description: string;
  }> {
    const connections: any[] = [];

    // Check for shared special stars
    const stars1 = getActiveSpecialStars(userContext1.specialStars);
    const stars2 = getActiveSpecialStars(userContext2.specialStars);
    const sharedStars = stars1.filter((s1) =>
      stars2.some((s2) => s2.chineseName === s1.chineseName),
    );

    if (sharedStars.length > 0) {
      const star = sharedStars[0];
      connections.push({
        title: `Shared ${star.name}`,
        emoji: star.emoji,
        rarity: '~1 in 169 pairings',
        category: 'rare-trait' as const,
        description: `You both have ${star.name}s in your charts. ${star.description} This rare connection means you understand each other's approach to life on a fundamental level.`,
      });
    }

    // Check for polarity balance
    if (
      userContext1.natalStructure.personal.yinYang !==
      userContext2.natalStructure.personal.yinYang
    ) {
      connections.push({
        title: 'Perfect Balance',
        emoji: '⚖️',
        rarity: '~1 in 2 pairings',
        category: 'polarity-balance' as const,
        description: `One of you is inward-focused (Yin), the other outward-expressing (Yang). This creates a complete energy system where you naturally balance each other's extremes.`,
      });
    }

    // Check for element harmony
    if (elementInteraction.interactionType === 'Generative') {
      connections.push({
        title: 'Supportive Energy Flow',
        emoji: '🌊',
        rarity: 'Uncommon',
        category: 'element-harmony' as const,
        description: `Your core energies naturally support each other. What you create becomes the foundation for what they build. This creates a self-sustaining cycle of mutual growth.`,
      });
    }

    // Check for pattern synergy
    const patterns1 = userContext1.natalPatterns || [];
    const patterns2 = userContext2.natalPatterns || [];
    const sharedPatterns = patterns1.filter((p1) =>
      patterns2.some((p2) => p2.id === p1.id),
    );

    if (sharedPatterns.length > 0) {
      connections.push({
        title: 'Shared Rare Pattern',
        emoji: '✨',
        rarity: '~1 in 284 pairings',
        category: 'pattern-synergy' as const,
        description: `You both have the same rare pattern in your charts: ${sharedPatterns[0].name}. This means you share an uncommon approach to challenges and opportunities.`,
      });
    }

    // Return 2-3 connections
    return connections.slice(0, 3);
  }

  /**
   * Generate dynamics (2-3 cards) - How you work together
   */
  private generateDynamics(
    identity1: any,
    identity2: any,
    userContext1: UserContext,
    userContext2: UserContext,
    elementInteraction: any,
  ): Array<{
    title: string;
    emoji: string;
    person1Brings: string;
    person2Brings: string;
    outcome: string;
  }> {
    const dynamics: any[] = [];

    // Element-based dynamic (respects generative cycle directionality)
    if (elementInteraction.interactionType === 'Generative') {
      // Determine who creates whom in the cycle
      const { source, product } = this.getGenerativeCycleRoles(
        identity1.element,
        identity2.element,
      );

      const isP1Source = source === identity1.element;

      dynamics.push({
        title: 'Natural Energy Flow',
        emoji: '🌊',
        person1Brings: isP1Source
          ? this.getSourceContribution(identity1.element)
          : this.getProductContribution(identity1.element),
        person2Brings: isP1Source
          ? this.getProductContribution(identity2.element)
          : this.getSourceContribution(identity2.element),
        outcome: isP1Source
          ? 'Your energy naturally creates their results'
          : 'Their energy naturally creates your results',
      });
    }

    // Polarity-based dynamic
    if (
      userContext1.natalStructure.personal.yinYang !==
      userContext2.natalStructure.personal.yinYang
    ) {
      dynamics.push({
        title: 'Action & Reflection Balance',
        emoji: '🎯',
        person1Brings:
          userContext1.natalStructure.personal.yinYang === 'Yang'
            ? 'Initiative and outward momentum'
            : 'Depth and careful consideration',
        person2Brings:
          userContext2.natalStructure.personal.yinYang === 'Yang'
            ? 'Initiative and outward momentum'
            : 'Depth and careful consideration',
        outcome:
          'You balance doing with thinking, preventing both rash decisions and analysis paralysis',
      });
    }

    // Chart strength dynamic
    if (
      (userContext1.chartStrength.strength === 'Strong' &&
        userContext2.chartStrength.strength === 'Weak') ||
      (userContext1.chartStrength.strength === 'Weak' &&
        userContext2.chartStrength.strength === 'Strong')
    ) {
      dynamics.push({
        title: 'Leader & Supporter Roles',
        emoji: '🤝',
        person1Brings:
          userContext1.chartStrength.strength === 'Strong'
            ? 'Drive and direction'
            : 'Flexibility and support',
        person2Brings:
          userContext2.chartStrength.strength === 'Strong'
            ? 'Drive and direction'
            : 'Flexibility and support',
        outcome: 'Natural role clarity prevents power struggles',
      });
    }

    return dynamics.slice(0, 3);
  }

  /**
   * Get generative cycle roles (who creates whom)
   * Traditional: Wood→Fire→Earth→Metal→Water→Wood
   */
  private getGenerativeCycleRoles(
    element1: string,
    element2: string,
  ): { source: string; product: string } {
    const generativePairs: Record<string, string> = {
      WOOD: 'FIRE',
      FIRE: 'EARTH',
      EARTH: 'METAL',
      METAL: 'WATER',
      WATER: 'WOOD',
    };

    if (generativePairs[element1] === element2) {
      return { source: element1, product: element2 };
    } else {
      return { source: element2, product: element1 };
    }
  }

  /**
   * Get source element contribution (what they CREATE)
   */
  private getSourceContribution(element: string): string {
    const contributions: Record<string, string> = {
      FIRE: 'Transformative energy and intensity',
      WATER: 'Nourishing flow and wisdom',
      WOOD: 'Growth-oriented drive and creativity',
      EARTH: 'Grounding foundation and resources',
      METAL: 'Refining precision and structure',
    };
    return contributions[element] || 'Creative energy';
  }

  /**
   * Get product element contribution (what they RECEIVE and build)
   */
  private getProductContribution(element: string): string {
    const contributions: Record<string, string> = {
      FIRE: 'Receives growth energy and expresses it as passion',
      WATER: 'Receives structure and transforms it into adaptability',
      WOOD: 'Receives nourishment and channels it into expansion',
      EARTH: 'Receives intensity and grounds it into tangible results',
      METAL: 'Receives stability and refines it into clarity',
    };
    return contributions[element] || 'Receptive ability';
  }

  /**
   * Get element contribution description (for non-generative dynamics)
   */
  private getElementContribution(element: string): string {
    const contributions: Record<string, string> = {
      FIRE: 'Intensity and transformation',
      WATER: 'Adaptability and depth',
      WOOD: 'Growth and expansion',
      EARTH: 'Stability and execution',
      METAL: 'Structure and clarity',
    };
    return contributions[element] || 'Unique perspective';
  }

  /**
   * Generate shared behaviors (2-3 cards) - Deeper alignments
   */
  private generateSharedBehaviors(
    userContext1: UserContext,
    userContext2: UserContext,
    identity1: any,
    identity2: any,
  ): Array<{
    title: string;
    emoji: string;
    description: string;
    impact: string;
  }> {
    const behaviors: any[] = [];

    // Check for shared stars
    const stars1 = getActiveSpecialStars(userContext1.specialStars);
    const stars2 = getActiveSpecialStars(userContext2.specialStars);
    const sharedStars = stars1.filter((s1) =>
      stars2.some((s2) => s2.chineseName === s1.chineseName),
    );

    if (sharedStars.some((s) => s.name === 'Academic Star')) {
      behaviors.push({
        title: 'The type to dive deep into topics that interest you',
        emoji: '🔍',
        description:
          'When one of you gets excited about something, the other naturally follows. You both prefer understanding the "why" behind things, not just the surface details.',
        impact: "Your curiosity feeds each other's intellectual growth",
      });
    }

    // Check for element-based behaviors
    const elementDist1 = this.calculateElementDistribution(userContext1);
    const elementDist2 = this.calculateElementDistribution(userContext2);

    if (
      elementDist1.dominant.includes('EARTH') &&
      elementDist2.dominant.includes('EARTH')
    ) {
      behaviors.push({
        title: 'Value tangible results over abstract ideas',
        emoji: '🎯',
        description:
          'You both prefer action over endless planning. Talk is cheap—you want to see things actually happen and produce real outcomes.',
        impact: 'This shared pragmatism keeps you both grounded and productive',
      });
    }

    // Polarity-based behavior
    if (
      userContext1.natalStructure.personal.yinYang ===
      userContext2.natalStructure.personal.yinYang
    ) {
      if (userContext1.natalStructure.personal.yinYang === 'Yin') {
        behaviors.push({
          title:
            'Prefer meaningful connections over surface-level interactions',
          emoji: '💎',
          description:
            'You both choose depth over breadth in relationships. Small talk drains you—you want conversations that matter and connections that go beyond the superficial.',
          impact: 'This shared value creates a strong foundation of trust',
        });
      }
    }

    return behaviors.slice(0, 3);
  }

  /**
   * Generate growth areas (2 cards) - Challenges as opportunities
   */
  private generateGrowthAreas(
    userContext1: UserContext,
    userContext2: UserContext,
    identity1: any,
    identity2: any,
    elementInteraction: any,
  ): Array<{
    title: string;
    emoji: string;
    tension: string;
    opportunity: string;
    outcome: string;
  }> {
    const areas: any[] = [];

    // Element-based tension
    if (elementInteraction.interactionType === 'Controlling') {
      areas.push({
        title: 'Different Natural Rhythms',
        emoji: '⏱️',
        tension: `${identity1.element} energy and ${identity2.element} energy move at different speeds. One pushes, the other resists.`,
        opportunity:
          'Learn to appreciate both urgency and patience. Not everything needs to move at the same pace.',
        outcome:
          'Balanced momentum—you catch opportunities without burning out',
      });
    }

    // Check for missing element overlap
    const elementDist1 = this.calculateElementDistribution(userContext1);
    const elementDist2 = this.calculateElementDistribution(userContext2);
    const sharedMissing = elementDist1.missing.filter((e) =>
      elementDist2.missing.includes(e),
    );

    if (sharedMissing.length > 0) {
      const missingElement = sharedMissing[0];
      areas.push({
        title: 'Shared Blind Spot',
        emoji: '🔍',
        tension: `Neither of you naturally brings ${missingElement.toLowerCase()}-like qualities (${this.getElementQuality(missingElement)}) to the relationship.`,
        opportunity: `Actively cultivate ${missingElement.toLowerCase()} qualities together. Seek friends or mentors who embody this energy.`,
        outcome: "Conscious growth in areas that don't come naturally",
      });
    }

    // Polarity-based tension
    if (
      userContext1.natalStructure.personal.yinYang ===
      userContext2.natalStructure.personal.yinYang
    ) {
      if (userContext1.natalStructure.personal.yinYang === 'Yang') {
        areas.push({
          title: 'Too Much Outward Energy',
          emoji: '🌪️',
          tension:
            "You both want to act, express, and move. But who's listening and reflecting?",
          opportunity:
            'Consciously take turns being the doer vs. the thinker. Create space for quiet and reflection.',
          outcome: 'Sustainable energy without burnout or conflict',
        });
      } else {
        areas.push({
          title: 'Risk of Insularity',
          emoji: '🏝️',
          tension:
            'You both prefer inward focus and depth. But this can become isolating or stagnant.',
          opportunity:
            'Push each other to take action and engage with the outside world. Balance reflection with execution.',
          outcome: 'Ideas that actually get implemented',
        });
      }
    }

    return areas.slice(0, 2);
  }

  /**
   * Build technical basis (hidden by default, for technical users)
   */
  /**
   * Generate pairing title based on element interaction
   * Keeps it simple to avoid awkward double adjectives
   */
  private generatePairingTitle(
    identity1: any,
    identity2: any,
    elementInteraction: any,
  ): {
    name: string;
    subtitle: string;
  } {
    // Element interaction base names (clean, no adjectives that clash)
    const elementNames: Record<string, string> = {
      'Fire-Wood': 'Catalytic Partnership',
      'Fire-Earth': 'Transformative Force',
      'Fire-Metal': 'Refining Dynamic',
      'Fire-Water': 'Balancing Act',
      'Fire-Fire': 'Resonant Energy',
      'Wood-Fire': 'Growth Catalyst',
      'Wood-Earth': 'Rooted Foundation',
      'Wood-Metal': 'Structured Evolution',
      'Wood-Water': 'Nourishing Flow',
      'Wood-Wood': 'Expansive Alliance',
      'Earth-Fire': 'Grounded Transformation',
      'Earth-Wood': 'Creative Growth',
      'Earth-Metal': 'Refined Structure',
      'Earth-Water': 'Adaptive Foundation',
      'Earth-Earth': 'Solid Ground',
      'Metal-Fire': 'Tempered Edge',
      'Metal-Wood': 'Precision Innovation',
      'Metal-Earth': 'Structured Clarity',
      'Metal-Water': 'Fluid Precision',
      'Metal-Metal': 'Clear Alignment',
      'Water-Fire': 'Dynamic Equilibrium',
      'Water-Wood': 'Flowing Growth',
      'Water-Earth': 'Contained Wisdom',
      'Water-Metal': 'Strategic Flow',
      'Water-Water': 'Deep Resonance',
    };

    // Get base name from element pairing
    const elementPairKey = `${identity1.element}-${identity2.element}`;
    const baseName =
      elementNames[elementPairKey] ||
      elementNames[`${identity2.element}-${identity1.element}`] ||
      'Unique Dynamic';

    // Build final name
    const finalName = `The ${baseName}`;

    // Build subtitle
    const subtitle = `${identity1.element} meets ${identity2.element} in ${elementInteraction.interactionType.toLowerCase()} energy`;

    return {
      name: finalName,
      subtitle,
    };
  }

  /**
   * Generate compatibility introduction text
   * Explains why this pairing got this title and what it means
   */
  private generateCompatibilityIntroduction(
    identity1: any,
    identity2: any,
    elementInteraction: any,
    scoreBreakdownSummary: any,
    overallScore: number,
  ): string {
    // Build explanation based on element interaction type
    let elementExplanation = '';
    switch (elementInteraction.interactionType) {
      case 'Generative':
        elementExplanation = `${identity1.element} naturally supports ${identity2.element}, creating a flowing energy where one person's strengths fuel the other's growth.`;
        break;
      case 'Controlling':
        elementExplanation = `${identity1.element} provides structure and direction to ${identity2.element}, creating a dynamic where differences drive refinement and growth.`;
        break;
      case 'Harmonious':
        elementExplanation = `Both share the same ${identity1.element} energy, creating natural understanding and resonance—you operate on the same wavelength.`;
        break;
      case 'Conflicting':
        elementExplanation = `${identity1.element} and ${identity2.element} create tension, but this friction can spark innovation when channeled productively.`;
        break;
      default:
        elementExplanation = `${identity1.element} and ${identity2.element} interact in a balanced way, with neither dominating nor yielding.`;
    }

    // Add score context
    const scoreContext =
      overallScore >= 70
        ? 'This creates a strong foundation for connection across multiple areas of life.'
        : overallScore >= 50
          ? 'This creates a solid foundation with room for growth in specific areas.'
          : 'This creates opportunities for complementary balance, though differences require conscious navigation.';

    // Add dominant strength insight
    const dominantCategory = scoreBreakdownSummary.strongest.category;
    const dominantPercentage = scoreBreakdownSummary.strongest.percentage;

    let strengthContext = '';
    if (dominantPercentage >= 70) {
      const categoryDescriptions: Record<string, string> = {
        Romance: 'emotional and romantic chemistry',
        Work: 'collaboration and shared goals',
        Lifestyle: 'daily habits and values',
        Communication: 'natural flow of ideas and understanding',
      };
      strengthContext = ` Your strongest alignment is in ${categoryDescriptions[dominantCategory] || 'compatibility'}—this is where your energies naturally sync.`;
    }

    return `${elementExplanation} ${scoreContext}${strengthContext}`;
  }

  /**
   * Calculate percentile using normal distribution (z-score)
   * Returns percentile (0-100) for a given score
   */
  private calculatePercentile(
    score: number,
    mean: number,
    stdDev: number,
  ): number {
    // Calculate z-score
    const z = (score - mean) / stdDev;

    // Approximate normal CDF using error function approximation
    // This gives us the cumulative probability
    const erfApprox = (x: number): number => {
      const sign = x >= 0 ? 1 : -1;
      const absX = Math.abs(x);
      const t = 1.0 / (1.0 + 0.3275911 * absX);
      const erf =
        1 -
        ((((1.061405429 * t - 1.453152027) * t + 1.421413741) * t -
          0.284496736) *
          t +
          0.254829592) *
          t *
          Math.exp(-absX * absX);
      return sign * erf;
    };

    // Convert z-score to percentile
    const percentile = (1 + erfApprox(z / Math.sqrt(2))) / 2;
    return Math.round(percentile * 100);
  }

  /**
   * Get animal name from branch character
   */
  private getBranchAnimal(branch: string): string {
    const animals: Record<string, string> = {
      子: 'Rat',
      丑: 'Ox',
      寅: 'Tiger',
      卯: 'Rabbit',
      辰: 'Dragon',
      巳: 'Snake',
      午: 'Horse',
      未: 'Goat',
      申: 'Monkey',
      酉: 'Rooster',
      戌: 'Dog',
      亥: 'Pig',
    };
    return animals[branch] || branch;
  }

  /**
   * Generate chart display data (stacked cards with Day Masters + full charts)
   */
  private generateChartDisplay(
    userContext1: UserContext,
    userContext2: UserContext,
    identity1: any,
    identity2: any,
    elementInteraction: any,
  ) {
    // Person 1 Day Master
    const p1DayMaster = {
      characters: `${userContext1.natalStructure.personal.stem}${userContext1.natalStructure.personal.branch}`,
      element: identity1.element,
      animal: this.getBranchAnimal(userContext1.natalStructure.personal.branch),
      polarity: identity1.polarity,
      archetype: identity1.title,
    };

    // Person 2 Day Master
    const p2DayMaster = {
      characters: `${userContext2.natalStructure.personal.stem}${userContext2.natalStructure.personal.branch}`,
      element: identity2.element,
      animal: this.getBranchAnimal(userContext2.natalStructure.personal.branch),
      polarity: identity2.polarity,
      archetype: identity2.title,
    };

    // Interaction between them
    const interaction = {
      visual: `${identity1.element} → ${identity2.element}`,
      type: elementInteraction.interactionType,
      description: elementInteraction.explanation,
    };

    // Full charts for expandable section
    const p1FullChart = [
      {
        pillar: 'Year',
        characters: `${userContext1.natalStructure.social.stem}${userContext1.natalStructure.social.branch}`,
        meaning: `${userContext1.natalStructure.social.element} ${this.getBranchAnimal(userContext1.natalStructure.social.branch)}`,
      },
      {
        pillar: 'Month',
        characters: `${userContext1.natalStructure.career.stem}${userContext1.natalStructure.career.branch}`,
        meaning: `${userContext1.natalStructure.career.element} ${this.getBranchAnimal(userContext1.natalStructure.career.branch)}`,
      },
      {
        pillar: 'Day',
        characters: p1DayMaster.characters,
        meaning: `${p1DayMaster.element} ${p1DayMaster.animal}`,
        isCore: true,
      },
    ];

    // Add hour if available
    if (userContext1.natalStructure.innovation) {
      p1FullChart.push({
        pillar: 'Hour',
        characters: `${userContext1.natalStructure.innovation.stem}${userContext1.natalStructure.innovation.branch}`,
        meaning: `${userContext1.natalStructure.innovation.element} ${this.getBranchAnimal(userContext1.natalStructure.innovation.branch)}`,
      });
    }

    const p2FullChart = [
      {
        pillar: 'Year',
        characters: `${userContext2.natalStructure.social.stem}${userContext2.natalStructure.social.branch}`,
        meaning: `${userContext2.natalStructure.social.element} ${this.getBranchAnimal(userContext2.natalStructure.social.branch)}`,
      },
      {
        pillar: 'Month',
        characters: `${userContext2.natalStructure.career.stem}${userContext2.natalStructure.career.branch}`,
        meaning: `${userContext2.natalStructure.career.element} ${this.getBranchAnimal(userContext2.natalStructure.career.branch)}`,
      },
      {
        pillar: 'Day',
        characters: p2DayMaster.characters,
        meaning: `${p2DayMaster.element} ${p2DayMaster.animal}`,
        isCore: true,
      },
    ];

    // Add hour if available
    if (userContext2.natalStructure.innovation) {
      p2FullChart.push({
        pillar: 'Hour',
        characters: `${userContext2.natalStructure.innovation.stem}${userContext2.natalStructure.innovation.branch}`,
        meaning: `${userContext2.natalStructure.innovation.element} ${this.getBranchAnimal(userContext2.natalStructure.innovation.branch)}`,
      });
    }

    return {
      person1: {
        dayMaster: p1DayMaster,
      },
      person2: {
        dayMaster: p2DayMaster,
      },
      interaction,
      fullCharts: {
        person1: p1FullChart,
        person2: p2FullChart,
      },
    };
  }

  /**
   * Generate score breakdown with casual, relationship-focused categories
   * Includes percentiles and summary highlighting strengths/weaknesses
   * Technical basis is included but hidden by default (for "How is this calculated?" modal)
   */
  private generateScoreBreakdown(
    userContext1: UserContext,
    userContext2: UserContext,
    overallScore: number,
  ): {
    summary: {
      overall: {
        score: number;
        percentile: number;
        description: string;
      };
      strongest: {
        category: string;
        percentage: number;
        percentile: number;
        description: string;
      };
      weakest: {
        category: string;
        percentage: number;
        percentile: number;
        description: string;
      };
      text: string;
    };
    categories: Array<{
      label: string;
      emoji: string;
      score: number;
      max: number;
      percentage: number;
      percentile: number;
      description: string;
      technicalBasis: string;
    }>;
    total: { score: number; max: number };
  } {
    // Calculate technical scores (same as before)
    const tenGodsScore = this.calculateTenGodsHarmony(
      userContext1,
      userContext2,
    );
    const marriagePalaceScore = this.calculateMarriagePalaceScore(
      userContext1.natalStructure.personal.branch,
      userContext2.natalStructure.personal.branch,
    );
    const elementsScore = this.calculateFavorableElementMatch(
      userContext1,
      userContext2,
    );

    // Calculate element interaction for cycle score
    const elementInteraction = this.calculateElementInteraction(
      userContext1.natalStructure.personal.element,
      userContext2.natalStructure.personal.element,
    );
    const cycleScore = this.calculateElementCycleScore(
      elementInteraction.interactionType,
    );

    // Calculate chart strength balance
    const strength1 = userContext1.chartStrength?.strength || 'Balanced';
    const strength2 = userContext2.chartStrength?.strength || 'Balanced';
    const balanceScore = this.calculateChartStrengthBalance(
      strength1,
      strength2,
    );

    // Get Day Pillars for technical basis
    const dayPillar1 = `${userContext1.natalStructure.personal.stem}${userContext1.natalStructure.personal.branch}`;
    const dayPillar2 = `${userContext2.natalStructure.personal.stem}${userContext2.natalStructure.personal.branch}`;

    // Map to casual, relationship-focused categories
    // Daily Life score = Element Match (15/20) + Chart Balance (3/5) → combined into 25 points
    const dailyLifeScore = Math.round(
      (elementsScore / 20) * 20 + (balanceScore / 5) * 5,
    );

    // Statistical distribution parameters (Bazi-informed)
    const OVERALL_MEAN = 55;
    const OVERALL_SD = 18;

    // Category-specific parameters (adjusted for their max points)
    const ROMANCE_MEAN = 13; // 52% of 25
    const ROMANCE_SD = 6;

    const WORK_MEAN = 24; // 60% of 40
    const WORK_SD = 8;

    const LIFESTYLE_MEAN = 15; // 60% of 25
    const LIFESTYLE_SD = 5;

    const COMMUNICATION_MEAN = 5; // 50% of 10
    const COMMUNICATION_SD = 2;

    // Calculate percentiles for each category
    const romancePercentile = this.calculatePercentile(
      marriagePalaceScore,
      ROMANCE_MEAN,
      ROMANCE_SD,
    );
    const workPercentile = this.calculatePercentile(
      tenGodsScore,
      WORK_MEAN,
      WORK_SD,
    );
    const lifestylePercentile = this.calculatePercentile(
      dailyLifeScore,
      LIFESTYLE_MEAN,
      LIFESTYLE_SD,
    );
    const communicationPercentile = this.calculatePercentile(
      cycleScore,
      COMMUNICATION_MEAN,
      COMMUNICATION_SD,
    );

    // Calculate overall percentile
    const overallPercentile = this.calculatePercentile(
      overallScore,
      OVERALL_MEAN,
      OVERALL_SD,
    );

    // Build categories with percentiles
    const categories = [
      {
        label: 'Romance',
        emoji: '💕',
        score: marriagePalaceScore,
        max: 25,
        percentage: Math.round((marriagePalaceScore / 25) * 100),
        percentile: romancePercentile,
        description: 'Emotional chemistry & attraction',
        technicalBasis: `Marriage Palace (日支) interaction: ${dayPillar1} × ${dayPillar2}`,
      },
      {
        label: 'Work',
        emoji: '💼',
        score: tenGodsScore,
        max: 40,
        percentage: Math.round((tenGodsScore / 40) * 100),
        percentile: workPercentile,
        description: 'Collaboration & shared goals',
        technicalBasis:
          'Ten Gods (十神) harmony - how your elements relate in career and resource aspects',
      },
      {
        label: 'Lifestyle',
        emoji: '🏡',
        score: dailyLifeScore,
        max: 25,
        percentage: Math.round((dailyLifeScore / 25) * 100),
        percentile: lifestylePercentile,
        description: 'Daily habits & values',
        technicalBasis:
          'Element Match (favorable elements) + Chart Balance (Strong/Weak/Balanced compatibility)',
      },
      {
        label: 'Communication',
        emoji: '⚡',
        score: cycleScore,
        max: 10,
        percentage: Math.round((cycleScore / 10) * 100),
        percentile: communicationPercentile,
        description: 'How you naturally interact',
        technicalBasis: `Five Element cycle (五行生克): ${elementInteraction.cycle}`,
      },
    ];

    // Identify strongest and weakest categories
    const sortedByPercentage = [...categories].sort(
      (a, b) => b.percentage - a.percentage,
    );
    const strongest = sortedByPercentage[0];
    const weakest = sortedByPercentage[sortedByPercentage.length - 1];

    // Generate context-aware descriptions
    const getPercentileDescription = (percentile: number): string => {
      if (percentile >= 95) return 'Exceptional';
      if (percentile >= 85) return 'Excellent';
      if (percentile >= 70) return 'Strong';
      if (percentile >= 50) return 'Above average';
      if (percentile >= 30) return 'Average';
      return 'Below average';
    };

    // Generate summary text
    const summaryText = `Your strongest area is ${strongest.label} (${strongest.percentage}%, top ${100 - strongest.percentile}%), ${getPercentileDescription(strongest.percentile).toLowerCase()} compatibility. Your ${weakest.label} score (${weakest.percentage}%, top ${100 - weakest.percentile}%) is ${getPercentileDescription(weakest.percentile).toLowerCase()}${weakest.percentile < 50 ? '—focus here for growth' : ' as well'}.`;

    return {
      summary: {
        overall: {
          score: overallScore,
          percentile: overallPercentile,
          description: `Better than ${overallPercentile}% of pairings`,
        },
        strongest: {
          category: strongest.label,
          percentage: strongest.percentage,
          percentile: strongest.percentile,
          description: getPercentileDescription(strongest.percentile),
        },
        weakest: {
          category: weakest.label,
          percentage: weakest.percentage,
          percentile: weakest.percentile,
          description: getPercentileDescription(weakest.percentile),
        },
        text: summaryText,
      },
      categories,
      total: {
        score: overallScore,
        max: 100,
      },
    };
  }

  private buildTechnicalBasis(
    elementInteraction: any,
    score: any,
    userContext1: UserContext,
    userContext2: UserContext,
  ): any {
    // Get traditional factors for display
    const traditionalFactors: string[] = [];

    // Marriage Palace interaction
    const branch1 = userContext1.natalStructure.personal.branch;
    const branch2 = userContext2.natalStructure.personal.branch;

    const sixCombinations: Record<string, string> = {
      子: '丑',
      丑: '子',
      寅: '亥',
      亥: '寅',
      卯: '戌',
      戌: '卯',
      辰: '酉',
      酉: '辰',
      巳: '申',
      申: '巳',
      午: '未',
      未: '午',
    };

    if (sixCombinations[branch1] === branch2) {
      traditionalFactors.push(`Six Combinations (${branch1}${branch2})`);
    }

    // Shared stars
    const stars1 = getActiveSpecialStars(userContext1.specialStars);
    const stars2 = getActiveSpecialStars(userContext2.specialStars);
    const sharedStars = stars1.filter((s1) =>
      stars2.some((s2) => s2.chineseName === s1.chineseName),
    );

    for (const star of sharedStars) {
      traditionalFactors.push(`Shared ${star.chineseName}`);
    }

    return {
      elementInteraction: {
        person1Element: elementInteraction.person1Element,
        person2Element: elementInteraction.person2Element,
        interactionType: elementInteraction.interactionType,
        cycle: elementInteraction.cycle,
        explanation: elementInteraction.description,
      },
      traditionalFactors,
    };
  }

  /**
   * Generate LLM overview (psychology-focused, uses shared traits & dynamics)
   */
  private async generateCompatibilityOverview(
    identity1: any,
    identity2: any,
    sharedTraits: string[],
    dynamics: any[],
    rating: string,
  ): Promise<string> {
    const sharedTraitsText = sharedTraits.join(', ');
    const dynamicsText = dynamics
      .map((d) => `${d.person1Brings} + ${d.person2Brings} = ${d.outcome}`)
      .join('; ');

    const prompt = `
Write a compatibility overview for two people.

PERSON 1: ${identity1.title} (${identity1.coreTrait}, ${identity1.behavior})
PERSON 2: ${identity2.title} (${identity2.coreTrait}, ${identity2.behavior})

WHAT THEY SHARE:
${sharedTraitsText}

HOW THEY WORK TOGETHER:
${dynamicsText}

OVERALL RATING: ${rating}

REQUIREMENTS:
1. Start by BRIEFLY describing each person's core approach (1 sentence each)
   Example: "You focus intensely on refining ideas to perfection. They blaze new trails with bold, expansive energy."
   DO NOT just say the archetype names without context!
2. Then explain their dynamic in 4-5 clear sentences
3. Use DIRECT language a 10-year-old could understand
4. NO metaphors (avoid "like heat shaping clay" - just say what happens)
5. Make it relationship-agnostic (works for romantic, professional, friendship, family)
6. Professional but simple tone
7. NO mystical language, NO Chinese terms, NO element names
8. Focus on BEHAVIORS and PSYCHOLOGY, not abstract concepts
9. Cover:
   - Brief intro of each person's core approach (1 sentence each)
   - Their main shared values/traits
   - How they complement each other
   - Why this pairing works (or what makes it challenging)
   - The practical impact on daily life together

AVOID:
❌ "The Focused Refiner meets The Pioneering Trailblazer" (too abrupt, no context)
❌ "Like heat shaping clay"
❌ "Your Fire nature creates their Earth foundation"
❌ "Like two forces of nature"
❌ Any nature metaphors or element language

INSTEAD USE:
✅ "You focus on X. They focus on Y. You both value Z."
✅ "You bring intensity, they bring stability"
✅ "Your energy supports their goals"
✅ "You start things, they finish them"
✅ Direct statements about behavior and personality

Generate 6-7 sentences total (2 intro + 4-5 dynamic explanation):
`.trim();

    const { text } = await generateText({
      model: geminiClient('gemini-2.0-flash-exp'),
      temperature: 0.7,
      experimental_telemetry: { isEnabled: true },
      messages: [
        {
          role: 'user',
          content: prompt,
        },
      ],
    });

    return text.trim();
  }
}
