// --- TYPES ---

import {
  ElementType,
  YinYangType,
} from '@aharris02/bazi-calculator-by-alvamind';

export type AuthenticTerm = {
  name: string; // English (e.g., "Direct Officer")
  cn: string; // Chinese (e.g., "正官")
  pinyin: string; // Pinyin (e.g., "Zheng Guan")
};

export type Tenant = AuthenticTerm & {
  element: string; // Element type (WOOD, FIRE, EARTH, METAL, WATER)
  isFavorable: boolean; // Is this element favorable for the user?
  description?: string; // Short helper text
};

export type TriggerSource = 'Daily' | 'Monthly' | 'Annual';

/**
 * Raw trigger data from extractor (view-agnostic)
 * No weighting applied - just factual interaction data from library
 */
export type RawTrigger = {
  type: string; // Interaction type (BranchClash, StemCombination, etc.)
  source: TriggerSource; // Primary source (Daily > Monthly > Annual)
  description: string; // Human-readable description from library
  involvesFavorable: boolean; // Does this involve favorable elements?
  involvesUnfavorable: boolean; // Does this involve unfavorable elements?
  affectedTenGods: string[]; // Ten God names of affected pillars
};

/**
 * Weighted trigger after view-specific aggregation
 * Used for final output to LLM/UI
 */
export type Trigger = RawTrigger & {
  intensity: number; // Calculated intensity after weighting
};

/**
 * Raw life area from extractor (view-agnostic)
 * No intensity calculation - aggregator handles that
 */
export type RawLifeArea = {
  key: string; // e.g., "personal"
  active: boolean; // Is something happening?
  triggers: RawTrigger[]; // Raw interaction data
};

/**
 * Weighted life area after aggregation
 * Used for final output to LLM/UI
 */
export type LifeArea = RawLifeArea & {
  intensity: number; // 0-100 Score (calculated by aggregator)
  triggers: Trigger[]; // Weighted triggers
};

/**
 * Pillar structure (natal or luck era)
 * Direct from library - no custom calculations
 */
export type PillarInfo = {
  tenGod: string | null; // Ten God name from library (null for self/Day pillar)
  element: ElementType; // Element from library
  yinYang: YinYangType; // Polarity from library
  lifeCycle?: string | null; // 十二长生 (12 Life Stages) from library
  stem?: string; // Heavenly Stem character (e.g., "甲", "乙")
  branch?: string; // Earthly Branch character (e.g., "子", "丑")
};

/**
 * Natal Pattern - Fixed chart configurations that significantly alter interpretation
 *
 * Patterns are detected ONCE from natal chart and remain fixed for life
 * Examples: 食傷生財 (Eating God Produces Wealth), 傷官配印 (Wounded Officer with Seal)
 *
 * Philosophy: Patterns are natal characteristics, not temporal calculations
 */
export type NatalPattern = {
  id: string; // Unique identifier (e.g., "shi-shang-sheng-cai")
  name: string; // English name (e.g., "Eating God Produces Wealth")
  chineseName: string; // Chinese name (e.g., "食神生財")
  category: 'regular' | 'special' | 'combination'; // Pattern classification

  // Detection basis
  detectionMethod: string; // Human-readable explanation of how this was detected
  involvedPillars: Array<'year' | 'month' | 'day' | 'hour'>; // Which pillars form this pattern

  // Pattern effects
  affectedCategories: Array<
    'career' | 'wealth' | 'relationships' | 'wellness' | 'personalGrowth'
  >; // Which life areas this pattern influences
  multiplier: number; // Scoring multiplier (e.g., 1.2 = 20% boost)
  description: string; // Traditional Bazi interpretation

  // Metadata
  strength: 'strong' | 'moderate' | 'weak'; // Pattern strength based on pillar positions
  significance: 'very-high' | 'high' | 'medium' | 'low'; // Overall importance
};

/**
 * User Context - Fixed natal characteristics extracted once per user
 *
 * Philosophy: Contains ONLY natal (birth chart) data that never changes
 * Extracted from CompleteAnalysis once, then reused for all timeframes
 *
 * Benefits:
 * - Clear separation of natal (fixed) vs temporal (changing) data
 * - Can cache per user (birthdate + gender)
 * - Patterns detected once and reused
 * - No performance impact (same data, just reorganized)
 *
 * Usage:
 * 1. Build once: BaziDataExtractor.buildUserContext(completeAnalysis)
 * 2. Pass to extract(): BaziDataExtractor.extract(userContext, dailyAnalysis)
 */
export type UserContext = {
  // Natal structure (Four Pillars) - from detailedPillars
  natalStructure: {
    social: PillarInfo; // Year pillar - ancestral roots, social identity
    career: PillarInfo; // Month pillar - career foundation, parental influence
    personal: PillarInfo; // Day pillar - self & spouse (tenGod always null)
    innovation: PillarInfo | null; // Hour pillar - children, legacy (null if time unknown)
  };

  // Favorable elements - from basicAnalysis.favorableElements
  favorableElements: {
    primary: ElementType[];
    secondary: ElementType[];
    unfavorable: ElementType[];
  } | null;

  // Chart strength - from basicAnalysis.dayMasterStrength
  chartStrength: {
    strength: 'Strong' | 'Weak' | 'Balanced';
    score: number;
    notes?: string[];
  } | null;

  // Element balance - from basicAnalysis.fiveFactors
  elementBalance: {
    WOOD: number;
    FIRE: number;
    EARTH: number;
    METAL: number;
    WATER: number;
  } | null;

  // Special stars - from basicAnalysis
  specialStars: {
    nobleman: string[]; // 天乙贵人 - helpers/supporters
    intelligence: string | null; // 文昌星 - academic/learning success
    skyHorse: string | null; // 驿马星 - movement/travel/change
    peachBlossom: string | null; // 桃花星 - relationships/charisma
  } | null;

  // Natal patterns (chart configurations) - detected from natal structure
  // Empty array for now, will be populated during pattern implementation phase
  natalPatterns: NatalPattern[];
};

/**
 * Raw Bazi data from extractor (view-agnostic)
 * Pure fact extraction with no weighting or intensity calculations
 *
 * Philosophy: Extract from library, map to UX structure, no custom calculations
 */
export type RawBaziData = {
  date: Date;

  // Current luck era (10-year cycle) - direct from library
  luckEra: {
    tenGod: string | null; // Ten God vs Day Master (from library)
    stemElement: ElementType;
    stemYinYang: YinYangType;
  } | null;

  // Natal structure (life areas) - direct from library
  natalStructure: {
    social: PillarInfo; // Year pillar
    career: PillarInfo; // Month pillar
    personal: PillarInfo; // Day pillar (tenGod always null - self)
    innovation: PillarInfo | null; // Hour pillar (null if time unknown)
  };

  // TODO #5: Chart strength - direct from library
  chartStrength: {
    strength: 'Strong' | 'Weak' | 'Balanced';
    score: number;
    notes?: string[];
  } | null;

  // TODO #6: Element balance (five factors) - direct from library
  elementBalance: {
    WOOD: number;
    FIRE: number;
    EARTH: number;
    METAL: number;
    WATER: number;
  } | null;

  // Element favorability - direct from library
  favorableElements: {
    primary: ElementType[];
    secondary: ElementType[];
    unfavorable: ElementType[];
  } | null;

  // Daily element - direct from library
  dailyElement: ElementType;

  // TODO #7: Period interaction context (how current time affects natal chart)
  periodContext: {
    annualPillar: PillarInfo | null; // Annual pillar (年柱) for this date
    monthlyPillar: PillarInfo | null; // Monthly pillar (月柱) for this date
    dailyPillar: PillarInfo; // Daily pillar (日柱) for this date
  };

  // Interactions mapped to life areas
  lifeAreas: {
    social: RawLifeArea;
    career: RawLifeArea;
    personal: RawLifeArea;
    innovation: RawLifeArea;
  };

  // Special stars (special beneficial stars) - direct from library
  specialStars: {
    nobleman: string[]; // 天乙贵人 - helpers/supporters appear
    intelligence: string | null; // 文昌星 - academic/learning success
    skyHorse: string | null; // 驿马星 - movement/travel/change
    peachBlossom: string | null; // 桃花星 - relationships/charisma
  } | null;

  // Natal patterns (chart configurations) - from userContext
  natalPatterns: NatalPattern[];
};

/**
 * DEPRECATED: Old interpretation format - replaced by FortuneReport
 * Kept for backward compatibility during migration
 */
export type SajuInterpretation = {
  date: Date;
  context: {
    theme: AuthenticTerm;
    luckEra: AuthenticTerm;
    userStructure: {
      type: string;
      favorable: string[];
      unfavorable: string[];
    };
  };
  lifeAreas: {
    social: LifeArea;
    career: LifeArea;
    personal: LifeArea;
    innovation: LifeArea;
  };
};

// ============================================================================
// SCORING SYSTEM (Two-Score: Opportunities + Challenges → Net)
// ============================================================================

/**
 * Category score with opportunities, challenges, and net
 * Traditional Bazi distinguishes:
 * - 吉神 (Ji Shen) - Auspicious influences → opportunities
 * - 凶神 (Xiong Shen) - Inauspicious influences → challenges
 */
export type CategoryScore = {
  opportunities: number; // 0-100: Favorable influences (吉神) - TEMPORAL factors only
  challenges: number; // 0-100: Unfavorable influences (凶神) - TEMPORAL factors only
  net: number; // 0-100: Calculated overall score
  // Scored from temporal factors only (no natal adjustments like patterns/chart strength)
  // Same score can mean different things based on natal context (interpreted by LLM)
};

export type FortuneScores = {
  overall: CategoryScore;
  career: CategoryScore; // 사업운/직업운
  wealth: CategoryScore; // 재물운
  relationships: CategoryScore; // 연애운/인간관계운
  wellness: CategoryScore; // 건강운
  personalGrowth: CategoryScore; // 자기계발운
};

// ============================================================================
// PHASE ANALYSIS (for aggregated reports)
// ============================================================================

/**
 * Phase analysis for monthly/yearly/chapter reports
 * Each report divided into Early/Mid/Late phases with normalized metrics
 */
export type PhaseAnalysis = {
  phase: 'Early' | 'Mid' | 'Late';

  // Period metrics
  units: number; // Number of days/months/years in this phase

  // Normalized scores (averaged per unit)
  avgScores: FortuneScores;

  // Density metrics (per day/month/year)
  avgInteractionsPerUnit: number;
  interactionBreakdown: {
    favorable: number; // Per unit
    unfavorable: number; // Per unit
    neutral: number; // Per unit
  };

  // Significance (absolute and relative)
  significantUnits: number; // Count of exceptional periods
  significantUnitRatio: number; // Percentage (0-1)

  // Deduplicated symbols
  luckySymbols: {
    numbers: number[];
    colors: string[];
    directions: string[];
  };

  // Phase characterization
  characterization:
    | 'peak'
    | 'challenging'
    | 'volatile'
    | 'stable'
    | 'moderate'
    | 'building'
    | 'consolidating'
    | 'foundation'
    | 'growth'
    | 'emergence';
};

// ============================================================================
// FORTUNE REPORT (Unified format for all timeframes)
// ============================================================================

/**
 * Unified fortune report format for all timeframes
 * PRD: Same structure for hour/daily/monthly/yearly/chapter reports
 */
export type FortuneReport = {
  // --- TIME CONTEXT ---
  timeframe: 'hour' | 'daily' | 'monthly' | 'yearly' | 'chapter';
  startDate: Date;
  endDate: Date;
  // Note: No label field - LLM generates the title/label

  // --- SCORES (two-score system: opportunities + challenges → net) ---
  scores: FortuneScores;

  // --- LUCKY SYMBOLS ---
  luckySymbols: {
    numbers: number[]; // e.g., [3, 7, 21] - Top lucky numbers
    colors: string[]; // e.g., ["Green", "Blue"]
    directions: string[]; // e.g., ["East", "Southeast"]
    // For aggregated reports: frequency-weighted data
    numbersWithFrequency?: Array<{
      number: number;
      frequency: number; // How many days/periods
      percentage: number; // 0-100: % of total period
    }>;
    colorsWithFrequency?: Array<{
      color: string;
      frequency: number;
      percentage: number;
    }>;
  };

  // --- SPECIAL STARS (active today/this period) ---
  specialStars: Array<{
    name: string; // e.g., "Peach Blossom"
    chineseName: string; // e.g., "桃花"
    description: string; // User-friendly description
    affectedCategories: Array<
      'career' | 'wealth' | 'relationships' | 'wellness' | 'personalGrowth'
    >;
    // For aggregated reports: timing/duration info
    activePeriods?: Array<{
      startDate: Date;
      endDate: Date;
      durationDays: number;
      phase?: 'Early' | 'Mid' | 'Late'; // Which phase of the report
    }>;
    totalActiveDays?: number; // Total days active in period
    activePercentage?: number; // 0-100: % of total period
  }>;

  // --- GRANULAR DATA (for daily/hour reports) ---
  hourlyBreakdown?: Array<{
    startTime: Date; // e.g., "2026-01-09 13:00"
    endTime: Date; // e.g., "2026-01-09 15:00"
    scores: FortuneReport['scores'];
  }>;

  // --- AGGREGATED DATA (for monthly/yearly/chapter reports) ---
  // Aggregation metadata (frequency-based filtering applied)
  aggregationMetadata?: {
    // Score volatility metrics (preserves volatility info lost in averaging)
    scoreVolatility: {
      standardDeviation: number; // e.g., 22 (shows how volatile scores are)
      min: number; // e.g., 5 (worst day)
      max: number; // e.g., 95 (best day)
      trend: 'increasing' | 'decreasing' | 'stable' | 'volatile'; // Overall pattern
      quartiles: {
        q1: number; // 25th percentile
        q3: number; // 75th percentile
      };
    };

    // Trigger patterns (filtered by frequency threshold)
    triggerPatterns: Array<{
      type: string; // e.g., "天克地沖"
      frequency: number; // e.g., 1,095 (how many days)
      percentage: number; // e.g., 15 (% of total period)
      favorableRatio: number; // 0-1: ratio of favorable to total occurrences
      yearSpread: number; // How many different years it appears in
      phase?: 'Early' | 'Mid' | 'Late' | 'All'; // Which phase it's concentrated in
    }>;

    // Filtering stats (transparency)
    filteringApplied: {
      totalUniqueTriggers: number; // e.g., 500
      significantTriggers: number; // e.g., 15 (kept)
      filteredOutTriggers: number; // e.g., 485 (noise removed)
      frequencyThreshold: number; // e.g., 5 (% minimum)
    };
  };

  // Phase-based analysis (normalized metrics for Early/Mid/Late periods)
  phaseAnalysis?: PhaseAnalysis[];

  // Significant periods (high opportunities OR challenges)
  significantPeriods?: Array<{
    startDate: Date;
    endDate: Date;
    category:
      | 'career'
      | 'wealth'
      | 'relationships'
      | 'wellness'
      | 'personalGrowth';
    type: 'peak' | 'challenging' | 'volatile';
    description: string; // e.g., "High career opportunity window"
  }>;

  // --- HEATMAP DATA (visualization data for frontend) ---
  // TODO #8-11: Time-series scores for visual trends
  // Dynamic based on report timeframe:
  // - Daily: 12 hourly blocks (2hr each)
  // - Monthly: 28-31 daily scores
  // - Yearly: 12 monthly scores
  // - Chapter: 20 yearly scores
  heatmapData: Array<{
    period: string; // ISO date or partial: "2019-01-15" | "2019-01" | "2019"
    opportunities: number; // 0-100
    challenges: number; // 0-100
    // Note: "net" is NOT included - frontend can calculate (opp - chal)
  }>;

  // --- TECHNICAL BASIS (raw facts only - no narratives) ---
  // LLMContextBuilder converts this to comprehensive LLMPromptContext
  technicalBasis: {
    dayMaster: PillarInfo; // Day Master pillar info
    natalStructure: RawBaziData['natalStructure']; // Natal chart structure
    chartStrength: RawBaziData['chartStrength']; // TODO #5: Chart strength (Strong/Weak/Balanced)
    elementBalance: RawBaziData['elementBalance']; // TODO #6: Element balance (five factors)
    periodContext: RawBaziData['periodContext']; // TODO #7: Period pillars (annual/monthly/daily)
    chartIdentity?: ChartIdentity; // TODO #4: Chart identity (for chapter reports only)
    luckEra: RawBaziData['luckEra']; // Primary luck era (or first if multiple)
    luckEraTransitions?: Array<{
      // For long ranges (chapters), track luck era (大運/대운) transitions
      luckEra: RawBaziData['luckEra'];
      startDate: Date;
      endDate: Date;
      daysInPeriod: number;
      isPreLuckEra: boolean; // True if no luck era active yet (before first era starts)
    }>;
    favorableElements: RawBaziData['favorableElements']; // Element favorability
    periodElement: ElementType; // Current period element
    rawTriggers: RawBaziData['lifeAreas']; // Raw interaction data
  };

  // --- METADATA ---
  metadata: {
    calculatedAt: Date;
    dataSource: 'bazi-calculator-by-alvamind';
    aggregatedFrom?: number; // For aggregated reports: how many data points (e.g., 365 days for yearly)
  };
};

/**
 * TODO #4: Chart Identity - Combines natal chart facts with major behavioral themes
 * Used for the "Who You Are" / "Chart Interaction" section in reports
 */
export type ChartIdentity = {
  // Core Facts (from TODO #5, #6)
  dayMaster: {
    element: ElementType;
    yinYang: YinYangType;
  };
  chartStrength: {
    strength: 'Strong' | 'Weak' | 'Balanced';
    score: number;
    interpretation: string; // Human-readable explanation
  };
  elementBalance: {
    dominant: Array<{ element: ElementType; count: number }>; // >= 30
    abundant: Array<{ element: ElementType; count: number }>; // 15-29
    balanced: Array<{ element: ElementType; count: number }>; // 5-14
    weak: Array<{ element: ElementType; count: number }>; // 1-4
    lacking: ElementType[]; // 0
    interpretation: string; // Human-readable explanation
  };

  // Major Themes (from TODO #3)
  majorThemes: Array<{
    pattern: {
      tenGod: string | null;
      interactionType: string | null;
      element: string | null;
      lifeArea: 'social' | 'career' | 'personal' | 'innovation';
      favorable: boolean;
      unfavorable: boolean;
      mixed: boolean;
    };
    significance: 'very-high' | 'high' | 'medium';
    frequency: number; // Number of occurrences
    percentage: number; // Percentage of total days
    yearSpread: number; // How many years this pattern appears
    years: number[]; // List of years this pattern appears
    label: string; // Human-readable pattern description
    interpretation: string; // Detailed explanation of this pattern
  }>;
};

/**
 * LLM Prompt Context - Comprehensive narrative context for LLM consumption
 * Separate from FortuneReport to allow multi-LLM testing and flexible prompt strategies
 *
 * Generated by LLMContextBuilder from FortuneReport + RawBaziData
 */
export type LLMPromptContext = {
  // --- FOUNDATIONAL CONTEXT ---
  dayMaster: {
    element: ElementType;
    yinYang: YinYangType;
    chineseName: string; // e.g., "甲木" (Yang Wood)
    meaning: string; // e.g., "Tall tree, leadership, growth-oriented"
    severity: 'strong' | 'moderate' | 'weak'; // Day Master strength
  };

  // --- PILLAR MEANINGS (life phase context) ---
  pillarMeanings: {
    year: string; // "Ancestral roots, social identity, early childhood (0-20)"
    month: string; // "Career foundation, parental influence, young adult (20-40)"
    day: string; // "Self and spouse, core personality, relationships"
    hour: string | null; // "Children, legacy, innovation, late life (60+)"
  };

  // --- TEN GOD NARRATIVES (category-specific interpretations) ---
  tenGodContext: {
    career: {
      favorableTenGods: Array<{
        star: string; // e.g., "Zheng Guan (正官)"
        natalCount: number; // How many times in natal chart (0-4)
        natalWeight: number; // Weighted by pillar importance (0-100)
        luckEraActive: boolean; // Is this Ten God active in current Luck Era?
        timing: string; // e.g., "Month Pillar (Career Prime)", "Luck Era (Current)"
        meaning: string; // What this Ten God brings to this category
      }>;
      unfavorableTenGods: Array<{
        star: string;
        natalCount: number;
        natalWeight: number;
        luckEraActive: boolean;
        timing: string;
        meaning: string;
      }>;
      netFavorability: string; // e.g., "favorable-mixed", "unfavorable-dominant", "neutral", "balanced"
      summary: string; // How natal + luck interact for this category
    };
    wealth: {
      favorableTenGods: Array<{
        star: string;
        natalCount: number;
        natalWeight: number;
        luckEraActive: boolean;
        timing: string;
        meaning: string;
      }>;
      unfavorableTenGods: Array<{
        star: string;
        natalCount: number;
        natalWeight: number;
        luckEraActive: boolean;
        timing: string;
        meaning: string;
      }>;
      netFavorability: string;
      summary: string;
    };
    relationships: {
      favorableTenGods: Array<{
        star: string;
        natalCount: number;
        natalWeight: number;
        luckEraActive: boolean;
        timing: string;
        meaning: string;
      }>;
      unfavorableTenGods: Array<{
        star: string;
        natalCount: number;
        natalWeight: number;
        luckEraActive: boolean;
        timing: string;
        meaning: string;
      }>;
      netFavorability: string;
      summary: string;
    };
    wellness: {
      favorableTenGods: Array<{
        star: string;
        natalCount: number;
        natalWeight: number;
        luckEraActive: boolean;
        timing: string;
        meaning: string;
      }>;
      unfavorableTenGods: Array<{
        star: string;
        natalCount: number;
        natalWeight: number;
        luckEraActive: boolean;
        timing: string;
        meaning: string;
      }>;
      netFavorability: string;
      summary: string;
    };
    personalGrowth: {
      favorableTenGods: Array<{
        star: string;
        natalCount: number;
        natalWeight: number;
        luckEraActive: boolean;
        timing: string;
        meaning: string;
      }>;
      unfavorableTenGods: Array<{
        star: string;
        natalCount: number;
        natalWeight: number;
        luckEraActive: boolean;
        timing: string;
        meaning: string;
      }>;
      netFavorability: string;
      summary: string;
    };
  };

  // --- ELEMENT DYNAMICS (5-element theory explanations) ---
  elementCycleExplanation: string; // e.g., "Water nourishes Wood (favorable), Earth controls Water (unfavorable)"
  periodElementRelationship: string; // e.g., "Fire consumes Wood energy (mild depletion)"

  // --- LUCK ERA SIGNIFICANCE ---
  luckEraContext: {
    ageRange: string; // e.g., "36-45 years old"
    lifePhase: string; // e.g., "中年期 (Middle Age: Career Peak Phase)"
    element: ElementType;
    tenGod: string | null;
    significance: string; // Traditional meaning of this era
  } | null;

  // --- INTERACTIONS (fully explained with traditional meanings) ---
  interactions: Array<{
    type: string; // e.g., "StemClash"
    chineseTerm: string; // e.g., "天干相冲"
    description: string; // Human-readable
    participants: string; // e.g., "Natal Year (己 Yin Earth) vs Luck Day (癸 Yin Water)"
    traditionalMeaning: string; // e.g., "Stem Clash indicates conflict, resistance, breakthrough through friction"
    affectedCategories: Array<
      'career' | 'wealth' | 'relationships' | 'wellness' | 'personalGrowth'
    >;
    favorability: 'favorable' | 'unfavorable' | 'neutral' | 'mixed';
    significance: 'high' | 'moderate' | 'low';
    interpretation: string; // e.g., "Career: Friction between foundational goals (Year) and current timing (Luck Day)"
  }>;

  // --- TRADITIONAL BAZI PATTERNS ---
  patterns: Array<{
    name: string; // e.g., "Eating God Produces Wealth"
    chineseName: string; // e.g., "食神生財"
    significance: 'high' | 'moderate' | 'low';
    description: string; // Traditional interpretation
    affectedCategories: Array<
      'career' | 'wealth' | 'relationships' | 'wellness' | 'personalGrowth'
    >;
  }>;

  // --- ELEMENT BALANCE ANALYSIS ---
  elementBalance: {
    WOOD: number;
    FIRE: number;
    EARTH: number;
    METAL: number;
    WATER: number;
    dominantElement: ElementType;
    weakestElement: ElementType;
    interpretation: string; // e.g., "Heavy Water, weak Fire: Emotional depth but low drive"
  };

  // --- SCORES (from FortuneReport) ---
  scores: FortuneReport['scores'];

  // --- TIMEFRAME CONTEXT ---
  timeframe: FortuneReport['timeframe'];
  startDate: Date;
  endDate: Date;

  // --- CHART IDENTITY (Chapter Reports Only) ---
  // TODO #13: Consolidated Day Master + Strength + Balance + Major Themes
  // Only included for chapter (20-year) reports, not daily/monthly/yearly
  // Directly uses ChartIdentity type with added energyType field
  chartIdentity?: ChartIdentity & {
    energyType: string; // Western-friendly: "Fire+", "Water-", etc.
  };
};

// ============================================================================
// UI PRESENTATION LAYER TYPES
// ============================================================================

/**
 * Chapter Report UI Response - Fully LLM-generated, ready for frontend
 *
 * This type is the final output sent to the frontend after LLM processing.
 * It embeds the raw FortuneReport + LLMPromptContext for data integrity.
 *
 * Generation Strategy:
 * - Use Vercel AI SDK with Zod schemas for strict typing
 * - Parallel prompt batches for performance (6 prompts)
 * - Each prompt receives full LLMPromptContext but focuses on specific section
 *
 * Data Integrity:
 * - Raw data embedded in `_source` field for verification
 * - LLM outputs validated against Zod schemas
 * - Frontend can cross-reference LLM text with raw technical basis
 */
export type ChapterReportUI = {
  // --- RAW DATA (source of truth for data integrity) ---
  _source: {
    fortuneReport: FortuneReport; // Raw aggregated report
    llmContext: LLMPromptContext; // Full context used for LLM generation
  };

  // --- HEADER ---
  title: string; // e.g., "The Hardening Stone"
  subtitle: string; // e.g., "Honor instilled, [rest of tagline]"
  keywords: string[]; // e.g., ["Ancestor", "Career", "Growth", "Mentor"]

  // --- INTRODUCTION ---
  introduction: string; // 2-3 paragraph overview of the chapter

  // --- VIBE CHECK ---
  vibeCheck: {
    introduction: string; // Brief intro to the 3 vibes
    vibes: Array<{
      label: string; // e.g., "Naturally Grounded 1"
      description: string; // 2-3 sentences explaining the vibe
      technicalBasis: string; // Technical explanation (optional for advanced users)
      affectedYears?: number[]; // Which years in the chapter this applies to
    }>;
  };

  // --- TURNING POINTS ---
  turningPoints: {
    introduction: string; // Brief intro to turning points
    timeline: Array<{
      year: number; // Absolute year (e.g., 1997)
      age: number; // Age at this year (e.g., 7)
      label: string; // e.g., "Turning Point 1"
      description: string; // What happens at this turning point
      exampleOutcomes: string[]; // Real-world examples
      technicalBasis: string; // Why this is a turning point (Bazi reasoning)
      categories: Array<
        'career' | 'wealth' | 'relationships' | 'wellness' | 'personalGrowth'
      >; // Which categories are affected
    }>;
    chartData: Array<{
      year: number; // Absolute year for x-axis
      age: number; // Age for labeling
      overallScore: number; // 0-100 net score for y-axis
      opportunities: number; // For tooltip/details
      challenges: number; // For tooltip/details
    }>;
  };

  // --- CHEAT SHEET ---
  cheatSheet: {
    introduction: string; // Brief intro to do's/don'ts
    encouraged: Array<{
      action: string; // e.g., "Focus on mentorship"
      reasoning: string; // Why this is encouraged
      bestYears?: number[]; // Optimal years for this action
    }>;
    discouraged: Array<{
      action: string; // e.g., "Avoid impulsive career changes"
      reasoning: string; // Why this is discouraged
      riskYears?: number[]; // Years to be extra cautious
    }>;
  };

  // --- KEY TAKEAWAYS ---
  takeaways: string; // Conclusion paragraph summarizing the chapter

  // --- METADATA ---
  metadata: {
    generatedAt: Date;
    modelUsed: string; // e.g., "gpt-4o"
    promptVersion: string; // e.g., "v1.0" for versioning prompts
  };
};

/**
 * Prompt Batching Strategy for ChapterReportUI
 *
 * PARALLEL BATCH 1 (Independent sections - can run simultaneously):
 * 1. Header Prompt (title, subtitle, keywords)
 * 2. Introduction Prompt
 * 3. Vibe Check Prompt
 * 4. Turning Points Prompt (includes timeline + chartData)
 * 5. Cheat Sheet Prompt
 * 6. Takeaways Prompt
 *
 * TOTAL: 6 parallel prompts
 * Expected latency: ~5-10s (single LLM round trip)
 * Cost: ~$0.10-0.30 per chapter report (depending on model)
 *
 * Data Flow:
 * 1. Backend: Generate FortuneReport + LLMPromptContext
 * 2. Backend: Batch 6 parallel LLM prompts (Vercel AI SDK)
 * 3. Backend: Validate responses with Zod schemas
 * 4. Backend: Assemble ChapterReportUI and return to frontend
 * 5. Frontend: Render UI, optionally show _source for "technical details" view
 */

/**
 * Zod Schema Template (to be implemented with Vercel AI SDK)
 *
 * Example for Vibe Check section:
 * ```typescript
 * const vibeCheckSchema = z.object({
 *   introduction: z.string().min(50).max(500),
 *   vibes: z.array(z.object({
 *     label: z.string().max(50),
 *     description: z.string().min(100).max(500),
 *     technicalBasis: z.string().min(50).max(300),
 *     affectedYears: z.array(z.number()).optional(),
 *   })).length(3), // Exactly 3 vibes
 * });
 * ```
 *
 * This ensures LLM output matches expected structure.
 */

// ============================================================================
// COMPATIBILITY REPORT TYPES
// ============================================================================

/**
 * Compatibility Report (Psychology-First Design)
 * Relationship-agnostic: works for romantic, professional, friendship, family
 *
 * Structure: Multiple card sections focusing on human psychology
 * Goal: Engaging, shareable, focuses on behaviors not Bazi jargon
 */
export type CompatibilityReport = {
  // --- METADATA ---
  // --- PAIRING TITLE (Report headline) ---
  // Unique name for this specific pairing based on element interaction + dominant strength
  pairingTitle: {
    name: string; // e.g., "The Growth Dynamic"
    subtitle: string; // e.g., "Fire meets Wood in generative energy"
  };

  // --- INTRODUCTION (Context for the scores) ---
  // Explains why this pairing got this title and what the element interaction means
  introduction: string; // 2-3 sentences explaining the pairing's core dynamic

  // NOTE: birthDateTime is NOT included in the output (similar to personal analysis)
  // It was only used for calculation, not needed in the response
  person1: {
    gender: 'male' | 'female';
    identity: {
      code: string; // e.g., "Fire-I"
      title: string; // e.g., "The Focused Refiner"
      element: string; // e.g., "Fire"
      polarity: string; // e.g., "Yin"
    };
  };

  person2: {
    gender: 'male' | 'female';
    identity: {
      code: string;
      title: string;
      element: string;
      polarity: string;
    };
  };

  // --- HERO SECTION ---
  score: {
    overall: number; // 0-100
    rating:
      | 'Highly Compatible'
      | 'Compatible'
      | 'Moderately Compatible'
      | 'Challenging'
      | 'Very Challenging';
    headline: string; // e.g., "A Generative Partnership"
  };

  rarity: {
    oneIn: number; // e.g., 3847
    percentile: number; // e.g., 99.97
    description: string; // e.g., "Rarer than 99.97% of all pairings"
  };

  // --- SHARED TRAITS (Pills/Tags) ---
  // Quick visual indicators of commonalities
  sharedTraits: string[]; // e.g., ["Intellectual curiosity", "Practical approach", "Value deep connections"]

  // --- SPECIAL CONNECTIONS (2-3 Cards) ---
  // Rare/unique things about this specific pairing
  specialConnections: Array<{
    title: string; // e.g., "Shared Academic Stars"
    emoji: string; // e.g., "📚"
    rarity: string; // e.g., "1 in 169 pairings"
    category:
      | 'rare-trait'
      | 'polarity-balance'
      | 'element-harmony'
      | 'pattern-synergy';
    description: string; // 2-3 sentences, psychology-focused
  }>;

  // --- HOW YOU WORK TOGETHER (2-3 Cards) ---
  // Complementary dynamics that create synergy
  dynamics: Array<{
    title: string; // e.g., "Complementary Energies"
    emoji: string; // e.g., "⚡"
    person1Brings: string; // e.g., "Vision and intensity"
    person2Brings: string; // e.g., "Execution and stability"
    outcome: string; // e.g., "Together, you build something lasting"
  }>;

  // --- YOU BOTH... (2-3 Cards) ---
  // Deeper behavioral/personality alignments
  sharedBehaviors: Array<{
    title: string; // e.g., "The type to dive deep into topics that interest you"
    emoji: string; // e.g., "🔍"
    description: string; // 2-3 sentences explaining the shared behavior
    impact: string; // e.g., "Your curiosity feeds each other's intellectual growth"
  }>;

  // --- GROWTH TOGETHER (2 Cards) ---
  // Challenges framed as growth opportunities
  growthAreas: Array<{
    title: string; // e.g., "Different Paces"
    emoji: string; // e.g., "⏱️"
    tension: string; // e.g., "You move in focused bursts; they prefer steady consistency"
    opportunity: string; // e.g., "Learn to appreciate both sprint and marathon approaches"
    outcome: string; // e.g., "Balanced momentum without burnout"
  }>;

  // --- YOUR DYNAMIC (LLM-Generated Overview) ---
  // 5-7 sentence synthesis, psychology-focused
  overview: string;

  // --- SCORE BREAKDOWN (Top-level, visible immediately after hero) ---
  // Casual, relationship-focused categories with technical basis hidden
  scoreBreakdown: {
    summary: {
      overall: {
        score: number; // e.g., 87
        percentile: number; // e.g., 96 (better than 96% of pairings)
        description: string; // e.g., "Better than 96% of pairings"
      };
      strongest: {
        category: string; // e.g., "Work"
        percentage: number; // e.g., 95
        percentile: number; // e.g., 98
        description: string; // e.g., "Exceptional collaboration potential"
      };
      weakest: {
        category: string; // e.g., "Romance"
        percentage: number; // e.g., 60
        percentile: number; // e.g., 62
        description: string; // e.g., "Above average, but room for growth"
      };
      text: string; // 2-3 sentence summary connecting it all
    };
    categories: Array<{
      label: string; // e.g., "Romance"
      emoji: string; // e.g., "💕"
      score: number; // e.g., 10
      max: number; // e.g., 25
      percentage: number; // e.g., 40
      percentile: number; // NEW: e.g., 62 (better than 62% of pairings)
      description: string; // e.g., "Emotional chemistry & attraction"
      technicalBasis: string; // e.g., "Marriage Palace (日支) interaction" - for "How is this calculated?" modal
    }>;
    total: {
      score: number; // Overall score (e.g., 87)
      max: number; // Always 100
    };
  };

  // --- CHART DISPLAY (Stacked cards showing Day Masters + full charts) ---
  chartDisplay: {
    person1: {
      dayMaster: {
        characters: string; // e.g., "丁酉"
        element: string; // e.g., "Fire"
        animal: string; // e.g., "Rooster"
        polarity: string; // e.g., "Yin"
        archetype: string; // e.g., "The Focused Refiner"
      };
    };
    person2: {
      dayMaster: {
        characters: string; // e.g., "甲卯"
        element: string; // e.g., "Wood"
        animal: string; // e.g., "Rabbit"
        polarity: string; // e.g., "Yang"
        archetype: string; // e.g., "The Pioneering Trailblazer"
      };
    };
    interaction: {
      visual: string; // e.g., "Fire → Wood"
      type: string; // e.g., "Generative"
      description: string; // Plain English explanation
    };
    fullCharts: {
      person1: Array<{
        pillar: string; // e.g., "Year", "Month", "Day", "Hour"
        characters: string; // e.g., "戊辰"
        meaning: string; // e.g., "Earth Dragon"
        isCore?: boolean; // true for Day pillar
      }>;
      person2: Array<{
        pillar: string;
        characters: string;
        meaning: string;
        isCore?: boolean;
      }>;
    };
  };

  // --- TECHNICAL BASIS (Hidden by default, for nerds) ---
  // Shown only if user clicks "Show me the science"
  technicalBasis?: {
    elementInteraction: {
      person1Element: string;
      person2Element: string;
      interactionType:
        | 'Generative'
        | 'Controlling'
        | 'Harmonious'
        | 'Conflicting'
        | 'Neutral';
      cycle: string;
      explanation: string;
    };
    traditionalFactors: string[]; // e.g., ["Six Combinations (子丑)", "Shared Academic Star (文昌)"]
  };

  // --- METADATA ---
  generatedAt: Date;
  reportType: 'compatibility-teaser' | 'compatibility-premium';
};

/**
 * Element Interaction Types (for compatibility analysis)
 */
export type ElementInteractionType =
  | 'Generative' // One element creates/nourishes the other (e.g., Fire → Earth)
  | 'Controlling' // One element controls/challenges the other (e.g., Fire → Metal)
  | 'Harmonious' // Same element or complementary polarity
  | 'Conflicting' // Clashing energies (e.g., Fire ↔ Water can be steam or extinguish)
  | 'Neutral'; // No strong interaction

/**
 * Compatibility Rating Scale
 */
export type CompatibilityRating =
  | 'Highly Compatible' // 80-100
  | 'Compatible' // 65-79
  | 'Moderately Compatible' // 50-64
  | 'Challenging' // 35-49
  | 'Very Challenging'; // 0-34
