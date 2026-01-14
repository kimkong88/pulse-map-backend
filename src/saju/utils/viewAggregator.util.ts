import {
  CompleteAnalysis,
  PersonalizedDailyAnalysisOutput,
  ElementType,
} from '@aharris02/bazi-calculator-by-alvamind';
import {
  FortuneReport,
  RawBaziData,
  CategoryScore,
  FortuneScores,
  ChartIdentity,
  NatalPattern,
} from '../types';
import { PatternInterpreter } from './patternInterpreter.util';

/**
 * ViewAggregator - Pure scoring and aggregation logic
 *
 * Responsibilities:
 * - Calculate fortune scores (0-100)
 * - Extract lucky symbols (numbers, colors, directions)
 * - Generate hourly breakdowns
 * - Aggregate reports (daily → monthly → yearly → chapter)
 * - Detect significant periods and turning points
 *
 * NOT responsible for:
 * - LLM narrative context (handled by LLMContextBuilder)
 * - Ten God meanings
 * - Element cycle explanations
 * - Interaction narratives
 */
export class ViewAggregator {
  /**
   * Life Cycle (十二长生) Multipliers
   * Adjusts Ten God strength based on their current life stage
   * Source: Traditional Bazi timing theory
   */
  private static readonly LIFE_CYCLE_MULTIPLIERS: Record<string, number> = {
    // Narrowed range from 0.2-1.5× to 0.6-1.3× for more realistic impact
    // Life Cycle is a qualitative modifier, not a massive multiplier
    长生: 1.1, // Birth/Growth - gaining strength (was 1.2)
    Birth: 1.1,
    沐浴: 0.85, // Bathing - vulnerable, transitioning (was 0.9)
    Bathing: 0.85,
    冠带: 1.0, // Crown - mature, establishing (was 1.1)
    'Crown Belt': 1.0,
    临官: 1.2, // Official - peak strength, active (was 1.3)
    Official: 1.2,
    帝旺: 1.3, // Emperor - strongest, maximum power (was 1.5)
    Emperor: 1.3,
    Thriving: 1.3, // Same as Emperor
    衰: 0.8, // Decline - losing power (unchanged)
    Weakening: 0.8,
    病: 0.7, // Sick - weak, struggling (was 0.6)
    Sick: 0.7,
    死: 0.65, // Death - very weak (was 0.4)
    Death: 0.65,
    墓: 0.6, // Tomb - buried, hidden (was 0.3)
    Tomb: 0.6,
    绝: 0.6, // Extinction - minimal influence (was 0.2)
    Extinction: 0.6,
    胎: 0.75, // Fetus - potential, not yet manifested (was 0.7)
    Fetus: 0.75,
    养: 0.9, // Nurture - recovering, growing (unchanged)
    Nourishing: 0.9,
  };

  /**
   * Get Life Cycle multiplier for a pillar
   * Returns 1.0 (neutral) if lifeCycle is not available
   */
  private static getLifeCycleMultiplier(lifeCycle?: string | null): number {
    if (!lifeCycle) return 1.0;
    return this.LIFE_CYCLE_MULTIPLIERS[lifeCycle] || 1.0;
  }

  /**
   * Generate daily fortune report
   */
  static forDaily(
    rawData: RawBaziData,
    baseAnalysis: CompleteAnalysis,
    dailyAnalysis: PersonalizedDailyAnalysisOutput,
    patterns: NatalPattern[] = [],
  ): FortuneReport {
    const date = rawData.date;

    // Calculate scores based on temporal factors only (no natal adjustments)
    const scores = this.calculateDailyScores(rawData);

    // Extract lucky symbols from favorable elements
    const luckySymbols = this.extractLuckySymbols(rawData);

    // Extract special stars (stubbed for now)
    const specialStars = this.extractSpecialStars(rawData);

    // Generate hourly breakdown (12 two-hour windows)
    const hourlyBreakdown = this.generateHourlyBreakdown(date, scores);

    // Generate heatmap data (hourly for daily reports)
    const heatmapData = this.generateDailyHeatmap(hourlyBreakdown);

    // Prepare simplified technical basis (raw facts only)
    const technicalBasis = this.prepareTechnicalBasis(rawData);

    return {
      timeframe: 'daily',
      startDate: date,
      endDate: date,
      scores,
      luckySymbols,
      specialStars,
      hourlyBreakdown,
      heatmapData,
      technicalBasis,
      metadata: {
        calculatedAt: new Date(),
        dataSource: 'bazi-calculator-by-alvamind',
      },
    };
  }

  /**
   * Aggregate daily reports into weekly report (FOR TESTING)
   */
  static forWeekly(dailyReports: FortuneReport[]): FortuneReport {
    if (dailyReports.length === 0) {
      throw new Error('ViewAggregator.forWeekly: No daily reports provided');
    }

    const startDate = dailyReports[0].startDate;
    const endDate = dailyReports[dailyReports.length - 1].endDate;

    // Weekly uses daily granularity for heatmap (same as monthly)
    const heatmapData = this.generateMonthlyHeatmap(dailyReports);

    return {
      timeframe: 'daily', // Keep as 'daily' timeframe but aggregated
      startDate,
      endDate,
      scores: this.aggregateScores(dailyReports),
      luckySymbols: this.aggregateLuckySymbols(dailyReports),
      specialStars: this.aggregateSpecialStars(dailyReports),
      phaseAnalysis: [], // No phase analysis for weekly (too short)
      significantPeriods: this.detectSignificantPeriods(dailyReports, 'daily'),
      heatmapData,
      technicalBasis: this.aggregateTechnicalBasis(dailyReports),
      metadata: {
        calculatedAt: new Date(),
        dataSource: 'bazi-calculator-by-alvamind',
        aggregatedFrom: dailyReports.length,
      },
    };
  }

  /**
   * Aggregate daily reports into monthly report
   */
  static forMonthly(dailyReports: FortuneReport[]): FortuneReport {
    if (dailyReports.length === 0) {
      throw new Error('ViewAggregator.forMonthly: No daily reports provided');
    }

    const startDate = dailyReports[0].startDate;
    const endDate = dailyReports[dailyReports.length - 1].endDate;

    // Analyze trigger patterns and score volatility
    const { patterns, filteringApplied } =
      this.analyzeTriggerPatterns(dailyReports);

    // Generate heatmap data (daily for monthly reports)
    const heatmapData = this.generateMonthlyHeatmap(dailyReports);

    return {
      timeframe: 'monthly',
      startDate,
      endDate,
      scores: this.aggregateScores(dailyReports),
      luckySymbols: this.aggregateLuckySymbols(dailyReports),
      specialStars: this.aggregateSpecialStars(dailyReports),
      aggregationMetadata: {
        scoreVolatility: this.analyzeScoreVolatility(dailyReports),
        triggerPatterns: patterns,
        filteringApplied,
      },
      phaseAnalysis: this.generatePhaseAnalysis(dailyReports, 'monthly'),
      significantPeriods: this.detectSignificantPeriods(dailyReports, 'daily'),
      heatmapData,
      technicalBasis: this.aggregateTechnicalBasis(dailyReports),
      metadata: {
        calculatedAt: new Date(),
        dataSource: 'bazi-calculator-by-alvamind',
        aggregatedFrom: dailyReports.length,
      },
    };
  }

  /**
   * Aggregate monthly reports into yearly report
   * Uses smart aggregation with breakthrough/valley detection (not simple averaging)
   */
  static forYearly(monthlyReports: FortuneReport[]): FortuneReport {
    if (monthlyReports.length === 0) {
      throw new Error('ViewAggregator.forYearly: No monthly reports provided');
    }

    const startDate = monthlyReports[0].startDate;
    const endDate = monthlyReports[monthlyReports.length - 1].endDate;

    // Analyze trigger patterns and score volatility
    const { patterns, filteringApplied } =
      this.analyzeTriggerPatterns(monthlyReports);

    // Generate heatmap data (monthly for yearly reports)
    const heatmapData = this.generateYearlyHeatmap(monthlyReports);

    return {
      timeframe: 'yearly',
      startDate,
      endDate,
      scores: this.aggregateScores(monthlyReports, 'yearly'),
      luckySymbols: this.aggregateLuckySymbols(monthlyReports),
      specialStars: this.aggregateSpecialStars(monthlyReports),
      aggregationMetadata: {
        scoreVolatility: this.analyzeScoreVolatility(monthlyReports),
        triggerPatterns: patterns,
        filteringApplied,
      },
      phaseAnalysis: this.generatePhaseAnalysis(monthlyReports, 'yearly'),
      significantPeriods: this.detectSignificantPeriods(
        monthlyReports,
        'monthly',
      ),
      heatmapData,
      technicalBasis: this.aggregateTechnicalBasis(monthlyReports),
      metadata: {
        calculatedAt: new Date(),
        dataSource: 'bazi-calculator-by-alvamind',
        aggregatedFrom: monthlyReports.length,
      },
    };
  }

  /**
   * Generate yearly sub-reports from daily reports (for chapter analysis)
   * Groups daily reports into years and aggregates each year
   *
   * @param dailyReports - Array of daily reports spanning multiple years
   * @param startDate - Chapter start date (for proper year boundaries)
   * @returns Array of 20 yearly FortuneReport objects
   */
  static generateYearlySubReports(
    dailyReports: FortuneReport[],
    startDate: Date,
  ): FortuneReport[] {
    if (dailyReports.length === 0) {
      throw new Error(
        'Cannot generate yearly sub-reports from empty daily reports',
      );
    }

    const yearlySubReports: FortuneReport[] = [];
    const yearsInChapter = 20;

    for (let yearIndex = 0; yearIndex < yearsInChapter; yearIndex++) {
      // Calculate year boundaries
      const yearStart = new Date(startDate);
      yearStart.setFullYear(startDate.getFullYear() + yearIndex);

      const yearEnd = new Date(yearStart);
      yearEnd.setFullYear(yearStart.getFullYear() + 1);
      yearEnd.setDate(yearEnd.getDate() - 1); // Last day of the year

      // Filter daily reports for this specific year
      const yearDailyReports = dailyReports.filter((report) => {
        const reportDate = report.startDate;
        return reportDate >= yearStart && reportDate <= yearEnd;
      });

      if (yearDailyReports.length === 0) {
        // Skip years with no data (shouldn't happen in normal operation)
        continue;
      }

      // Get annual pillar from first day of year (same for whole year)
      // Note: We need the rawData that was used to create these daily reports
      // For now, we'll use aggregation but this should be refactored to use annual pillar

      // Analyze patterns (for metadata only)
      const { patterns, filteringApplied } =
        this.analyzeTriggerPatterns(yearDailyReports);

      // Generate heatmap (daily granularity for yearly sub-reports from daily)
      const heatmapData = this.generateMonthlyHeatmap(yearDailyReports);

      const yearlyReport: FortuneReport = {
        timeframe: 'yearly',
        startDate: yearStart,
        endDate: yearEnd,
        scores: this.aggregateScores(yearDailyReports, 'yearly'),
        luckySymbols: this.aggregateLuckySymbols(yearDailyReports),
        specialStars: this.aggregateSpecialStars(yearDailyReports),
        aggregationMetadata: {
          scoreVolatility: this.analyzeScoreVolatility(yearDailyReports),
          triggerPatterns: patterns,
          filteringApplied,
        },
        phaseAnalysis: this.generatePhaseAnalysis(yearDailyReports, 'yearly'),
        significantPeriods: this.detectSignificantPeriods(
          yearDailyReports,
          'daily',
        ),
        heatmapData,
        technicalBasis: this.aggregateTechnicalBasis(yearDailyReports),
        metadata: {
          calculatedAt: new Date(),
          dataSource: 'bazi-calculator-by-alvamind',
          aggregatedFrom: yearDailyReports.length,
        },
      };

      yearlySubReports.push(yearlyReport);
    }

    return yearlySubReports;
  }

  /**
   * Aggregate yearly reports into chapter report (20 years)
   */
  static forChapter(yearlyReports: FortuneReport[]): FortuneReport {
    if (yearlyReports.length === 0) {
      throw new Error('ViewAggregator.forChapter: No yearly reports provided');
    }

    const startDate = yearlyReports[0].startDate;
    const endDate = yearlyReports[yearlyReports.length - 1].endDate;

    // Analyze trigger patterns and score volatility
    const { patterns, filteringApplied } =
      this.analyzeTriggerPatterns(yearlyReports);

    // Generate heatmap data (yearly for chapter reports)
    const heatmapData = this.generateChapterHeatmap(yearlyReports);

    return {
      timeframe: 'chapter',
      startDate,
      endDate,
      scores: this.aggregateScores(yearlyReports, 'chapter'),
      luckySymbols: this.aggregateLuckySymbols(yearlyReports),
      specialStars: this.aggregateSpecialStars(yearlyReports),
      aggregationMetadata: {
        scoreVolatility: this.analyzeScoreVolatility(yearlyReports),
        triggerPatterns: patterns,
        filteringApplied,
      },
      phaseAnalysis: this.generatePhaseAnalysis(yearlyReports, 'chapter'),
      significantPeriods: this.detectSignificantPeriods(
        yearlyReports,
        'yearly',
      ),
      heatmapData,
      technicalBasis: this.aggregateTechnicalBasis(yearlyReports),
      metadata: {
        calculatedAt: new Date(),
        dataSource: 'bazi-calculator-by-alvamind',
        aggregatedFrom: yearlyReports.length,
      },
    };
  }

  // --- PRIVATE: SCORING ---

  /**
   * Calculate daily fortune scores
   * PRD: 50 = neutral baseline, adjust based on triggers and element favorability
   */
  /**
   * Calculate period scores (temporal factors only - no natal adjustments)
   */
  private static calculateDailyScores(rawData: RawBaziData): FortuneScores {
    // Calculate individual category scores (temporal only)
    const career = this.calculateCategoryScore(rawData, 'career');
    const wealth = this.calculateCategoryScore(rawData, 'wealth');
    const relationships = this.calculateCategoryScore(rawData, 'relationships');
    const wellness = this.calculateCategoryScore(rawData, 'wellness');
    const personalGrowth = this.calculateCategoryScore(
      rawData,
      'personalGrowth',
    );

    // Calculate overall as average of all categories
    const overallOpportunities =
      (career.opportunities +
        wealth.opportunities +
        relationships.opportunities +
        wellness.opportunities +
        personalGrowth.opportunities) /
      5;

    const overallChallenges =
      (career.challenges +
        wealth.challenges +
        relationships.challenges +
        wellness.challenges +
        personalGrowth.challenges) /
      5;

    const overall: CategoryScore = {
      opportunities: Math.round(overallOpportunities),
      challenges: Math.round(overallChallenges),
      net: this.calculateNetScore(overallOpportunities, overallChallenges),
    };

    return {
      overall,
      career,
      wealth,
      relationships,
      wellness,
      personalGrowth,
    };
  }

  /**
   * Calculate period score for a specific category
   *
   * NEW SCORING: Temporal base + Personal modifiers (no natal bias)
   * 1. Element presence (universal - same for everyone)
   * 2. Luck Era Ten Gods (personal timing - 10-year cycle)
   * 3. Interactions (temporal × natal - how today affects YOUR chart)
   * 4. Special stars (temporal)
   */
  private static calculateCategoryScore(
    rawData: RawBaziData,
    category:
      | 'career'
      | 'wealth'
      | 'relationships'
      | 'wellness'
      | 'personalGrowth',
  ): CategoryScore {
    let opportunities = 50; // Start neutral
    let challenges = 50;

    // 1. Element presence (universal - same for everyone on same day)
    const elementScore = this.scoreElementPresence(rawData);
    opportunities += elementScore;

    // 2. Luck Era Ten Gods (personal timing)
    const luckEraScore = this.scoreLuckEraTenGods(rawData, category);
    opportunities += luckEraScore.opportunities;
    challenges += luckEraScore.challenges;

    // 3. Interactions between temporal and natal (personal)
    const interactionScore = this.scoreWeightedPillars(
      rawData,
      category,
      this.getCategoryPillarWeights(category),
    );
    opportunities += interactionScore.opportunities;
    challenges += interactionScore.challenges;

    // 4. Special star bonuses (temporal)
    const specialStarBonus = this.scoreSpecialStars(rawData, category);
    opportunities += specialStarBonus;

    // Clamp to 0-100
    opportunities = Math.max(0, Math.min(100, opportunities));
    challenges = Math.max(0, Math.min(100, challenges));

    return {
      opportunities,
      challenges,
      net: this.calculateNetScore(opportunities, challenges),
    };
  }

  /**
   * Get pillar weight distribution for each category (industry standard)
   */
  private static getCategoryPillarWeights(
    category: string,
  ): Record<keyof RawBaziData['lifeAreas'], number> {
    const weights: Record<
      string,
      Record<keyof RawBaziData['lifeAreas'], number>
    > = {
      // Career: Month (primary) > Year (reputation) > Hour (legacy) > Personal
      career: { social: 0.2, career: 0.5, personal: 0.1, innovation: 0.2 },

      // Wealth: All pillars matter, Day strength is key
      wealth: { social: 0.15, career: 0.35, personal: 0.35, innovation: 0.15 },

      // Relationships: Year (social) + Personal (intimate) are primary
      relationships: {
        social: 0.4,
        career: 0.1,
        personal: 0.4,
        innovation: 0.1,
      },

      // Wellness: Day (self) is primary, all others secondary
      wellness: { social: 0.1, career: 0.1, personal: 0.7, innovation: 0.1 },

      // Personal Growth: Hour (future) > Personal (current) > Career (skills)
      personalGrowth: {
        social: 0.1,
        career: 0.2,
        personal: 0.3,
        innovation: 0.4,
      },
    };

    return weights[category];
  }

  /**
   * Score based on Ten God presence (KEY DIFFERENTIATOR between categories)
   * NOW PATTERN-AWARE: Uses PatternInterpreter to adjust Ten God favorability
   */

  /**
   * Score element presence (universal - same for everyone on same day)
   * Measures: diversity of elements and dominance
   * NOT comparing to favorable/unfavorable (that's natal context for LLM)
   */
  private static scoreElementPresence(rawData: RawBaziData): number {
    const elements: ElementType[] = [];

    // Collect elements from temporal pillars
    if (rawData.periodContext.dailyPillar?.element) {
      elements.push(rawData.periodContext.dailyPillar.element);
    }
    if (rawData.periodContext.monthlyPillar?.element) {
      elements.push(rawData.periodContext.monthlyPillar.element);
    }
    if (rawData.periodContext.annualPillar?.element) {
      elements.push(rawData.periodContext.annualPillar.element);
    }

    if (elements.length === 0) return 0;

    // Score based on diversity (more elements = more dynamic)
    const uniqueElements = new Set(elements);
    const diversityScore = uniqueElements.size * 3; // 0-9 points (max 3 unique)

    // Score based on dominance (same element repeating = strong energy)
    const elementCounts = new Map<ElementType, number>();
    elements.forEach((e) =>
      elementCounts.set(e, (elementCounts.get(e) || 0) + 1),
    );
    const maxCount = Math.max(...elementCounts.values());
    const dominanceScore = maxCount >= 2 ? 6 : 0; // +6 if any element appears 2+ times

    return diversityScore + dominanceScore; // 0-15 points
  }

  /**
   * Score Luck Era Ten Gods (personal timing - 10-year cycle)
   * This is YOUR personal cycle, different from everyone else
   */
  private static scoreLuckEraTenGods(
    rawData: RawBaziData,
    category: string,
  ): { opportunities: number; challenges: number } {
    let opportunities = 0;
    let challenges = 0;

    // Define favorable Ten Gods for each category
    const favorableTenGods: Record<string, string[]> = {
      career: ['Direct Officer', 'Zheng Guan', '正官', '偏官', '7 Killings'],
      wealth: ['Direct Wealth', 'Zheng Cai', '正財', 'Indirect Wealth', '偏財'],
      relationships: [
        'Direct Resource',
        'Zheng Yin',
        '正印',
        'Indirect Resource',
        '偏印',
      ],
      wellness: ['Rob Wealth', 'Jie Cai', '劫財', 'Friend', '比肩'],
      personalGrowth: [
        'Eating God',
        'Shi Shen',
        '食神',
        'Hurting Officer',
        '傷官',
      ],
    };

    const unfavorableTenGods: Record<string, string[]> = {
      career: [
        'Eating God',
        'Shi Shen',
        '食神',
        'Hurting Officer',
        'Shang Guan',
        '傷官',
      ],
      wealth: ['Rob Wealth', 'Jie Cai', '劫財', 'Friend', '比肩'],
      relationships: [
        'Direct Officer',
        'Zheng Guan',
        '正官',
        '7 Killings',
        'Qi Sha',
        '七殺',
      ],
      wellness: [
        'Direct Wealth',
        'Zheng Cai',
        '正財',
        'Indirect Wealth',
        'Pian Cai',
        '偏財',
      ],
      personalGrowth: [
        'Direct Resource',
        'Zheng Yin',
        '正印',
        'Indirect Resource',
        'Pian Yin',
        '偏印',
      ],
    };

    const categoryFavorable = favorableTenGods[category] || [];
    const categoryUnfavorable = unfavorableTenGods[category] || [];

    // Check Luck Era (YOUR personal 10-year cycle)
    if (rawData.luckEra?.tenGod) {
      const luckTenGod = rawData.luckEra.tenGod;
      const luckEraWeight = 5;

      if (categoryFavorable.some((tg) => luckTenGod.includes(tg))) {
        opportunities += luckEraWeight;
      }

      if (categoryUnfavorable.some((tg) => luckTenGod.includes(tg))) {
        challenges += luckEraWeight;
      }
    }

    return { opportunities, challenges };
  }

  /**
   * Score from weighted pillar analysis (interactions in relevant areas)
   */
  private static scoreWeightedPillars(
    rawData: RawBaziData,
    category: string,
    weights: Record<keyof RawBaziData['lifeAreas'], number>,
  ): { opportunities: number; challenges: number } {
    let opportunities = 0;
    let challenges = 0;

    // Analyze each life area with appropriate weight
    // NOTE: Interactions (clashes/combinations) are MAJOR events in traditional Bazi
    // Increased from 5 to 8 to match traditional emphasis
    for (const [area, weight] of Object.entries(weights)) {
      const areaData =
        rawData.lifeAreas[area as keyof RawBaziData['lifeAreas']];
      if (!areaData) continue;

      if (areaData.active) {
        for (const trigger of areaData.triggers) {
          if (trigger.involvesFavorable) {
            opportunities += 8 * weight; // Increased from 5 (+60%)
          }
          if (trigger.involvesUnfavorable) {
            challenges += 8 * weight; // Increased from 5 (+60%)
          }
        }
      }
    }

    return { opportunities, challenges };
  }

  /**
   * Score special stars (lucky breaks and support)
   * Adds opportunity bonuses when special stars are present
   */
  private static scoreSpecialStars(
    rawData: RawBaziData,
    category: string,
  ): number {
    if (!rawData.specialStars) return 0;

    let bonus = 0;
    let starCount = 0;

    // Nobleman (天乙贵人) - helpers/supporters appear
    // Benefit: relationships, career (influential people)
    if (rawData.specialStars.nobleman.length > 0) {
      starCount++;
      if (category === 'relationships') {
        bonus += 4; // Reduced from 7 (-43%)
      } else if (category === 'career') {
        bonus += 3; // Reduced from 5 (-40%)
      } else {
        bonus += 1; // Reduced from 2 (-50%)
      }
    }

    // Intelligence (文昌星) - academic/learning success
    // Benefit: personal growth, career (knowledge-based)
    if (rawData.specialStars.intelligence) {
      starCount++;
      if (category === 'personalGrowth') {
        bonus += 4; // Reduced from 7 (-43%)
      } else if (category === 'career') {
        bonus += 2; // Reduced from 4 (-50%)
      } else {
        bonus += 1; // Reduced from 2 (-50%)
      }
    }

    // Sky Horse (驿马星) - movement/travel/change
    // Benefit: career (opportunities through movement), personal growth (new experiences)
    if (rawData.specialStars.skyHorse) {
      starCount++;
      if (category === 'career') {
        bonus += 3; // Reduced from 6 (-50%)
      } else if (category === 'personalGrowth') {
        bonus += 3; // Reduced from 5 (-40%)
      } else {
        bonus += 1; // Reduced from 2 (-50%)
      }
    }

    // Peach Blossom (桃花星) - relationships/charisma
    // Benefit: relationships (strong), personal growth (social skills)
    if (rawData.specialStars.peachBlossom) {
      starCount++;
      if (category === 'relationships') {
        bonus += 4; // Reduced from 8 (-50%)
      } else if (category === 'personalGrowth') {
        bonus += 2; // Reduced from 4 (-50%)
      } else {
        bonus += 1; // Reduced from 2 (-50%)
      }
    }

    // Apply diminishing returns if blessed with many stars
    // Traditional Bazi: having many special stars is rare and powerful,
    // but they shouldn't stack linearly to dominate the entire chart
    if (starCount >= 3) {
      bonus *= 0.75; // 25% reduction when 3+ stars present
    }

    return Math.round(bonus);
  }

  /**
   * Score from element favorability (affects categories differently)
   */

  /**
   * Calculate net score from opportunities and challenges
   *
   * Formula: net = opportunities - challenges + 50
   *
   * Examples:
   * - opp=80, chal=20 → net = 110 → clamped to 100 (very favorable)
   * - opp=20, chal=80 → net = -10 → clamped to 0 (very unfavorable)
   * - opp=80, chal=80 → net = 50 (high intensity, but BALANCED)
   * - opp=30, chal=30 → net = 50 (low intensity, also balanced)
   * - opp=50, chal=50 → net = 50 (baseline neutral)
   *
   * Interpretation:
   * - 50 = balanced (regardless of intensity)
   * - >50 = favorable forces dominate
   * - <50 = unfavorable forces dominate
   */
  private static calculateNetScore(
    opportunities: number,
    challenges: number,
  ): number {
    const net = opportunities - challenges + 50;
    return Math.round(Math.max(0, Math.min(100, net)));
  }

  // --- PRIVATE: LUCKY SYMBOLS ---

  /**
   * Extract lucky symbols from favorable elements
   */
  private static extractLuckySymbols(
    rawData: RawBaziData,
  ): FortuneReport['luckySymbols'] {
    const favorableElements = rawData.favorableElements?.primary || [];

    const numbers: number[] = [];
    const colors: string[] = [];
    const directions: string[] = [];

    for (const element of favorableElements) {
      // Map elements to traditional lucky numbers
      switch (element) {
        case 'WOOD':
          numbers.push(3, 8);
          colors.push('Green', 'Blue');
          directions.push('East', 'Southeast');
          break;
        case 'FIRE':
          numbers.push(2, 7);
          colors.push('Red', 'Purple');
          directions.push('South');
          break;
        case 'EARTH':
          numbers.push(5, 0);
          colors.push('Yellow', 'Brown');
          directions.push('Center', 'Southwest');
          break;
        case 'METAL':
          numbers.push(4, 9);
          colors.push('White', 'Gold');
          directions.push('West', 'Northwest');
          break;
        case 'WATER':
          numbers.push(1, 6);
          colors.push('Black', 'Navy');
          directions.push('North');
          break;
      }
    }

    return {
      numbers: [...new Set(numbers)].slice(0, 5),
      colors: [...new Set(colors)].slice(0, 3),
      directions: [...new Set(directions)].slice(0, 2),
    };
  }

  /**
   * Extract special stars (stubbed - Phase 2)
   */
  private static extractSpecialStars(
    rawData: RawBaziData,
  ): FortuneReport['specialStars'] {
    // TODO: Extract from library's special stars
    // Examples: Nobleman, Peach Blossom, Sky Horse, Eight Mansions
    return [];
  }

  // --- PRIVATE: HOURLY BREAKDOWN ---

  /**
   * Generate hourly breakdown (12 two-hour windows)
   * TODO: Implement hour-specific scoring based on hour pillar
   */
  private static generateHourlyBreakdown(
    date: Date,
    dailyScores: FortuneReport['scores'],
  ): FortuneReport['hourlyBreakdown'] {
    const breakdown: FortuneReport['hourlyBreakdown'] = [];

    // Traditional Bazi hour blocks (2-hour windows)
    for (let i = 0; i < 12; i++) {
      const startHour = (i * 2 + 23) % 24; // 23-01, 01-03, 03-05, ...
      const endHour = (startHour + 2) % 24;

      const startTime = new Date(date);
      startTime.setHours(startHour, 0, 0, 0);

      const endTime = new Date(date);
      endTime.setHours(endHour, 0, 0, 0);
      if (endHour < startHour) {
        endTime.setDate(endTime.getDate() + 1);
      }

      // TODO: Calculate hour-specific scores
      // For now, use daily scores as placeholder
      breakdown.push({
        startTime,
        endTime,
        scores: dailyScores,
      });
    }

    return breakdown;
  }

  /**
   * Generate heatmap data for daily report (hourly granularity)
   * TODO #9: Convert hourly breakdown to heatmap format
   */
  private static generateDailyHeatmap(
    hourlyBreakdown: FortuneReport['hourlyBreakdown'],
  ): FortuneReport['heatmapData'] {
    return hourlyBreakdown.map((block) => {
      // Format as HH:mm for hourly blocks
      const hour = block.startTime.getHours().toString().padStart(2, '0');
      const minute = block.startTime.getMinutes().toString().padStart(2, '0');

      return {
        period: `${hour}:${minute}`,
        opportunities: block.scores.overall.opportunities,
        challenges: block.scores.overall.challenges,
      };
    });
  }

  /**
   * Generate heatmap data for monthly report (daily granularity)
   * TODO #9: Extract daily scores from each daily report
   */
  private static generateMonthlyHeatmap(
    dailyReports: FortuneReport[],
  ): FortuneReport['heatmapData'] {
    return dailyReports.map((report) => {
      // Format as YYYY-MM-DD for daily scores
      const date = report.startDate;
      const year = date.getFullYear();
      const month = (date.getMonth() + 1).toString().padStart(2, '0');
      const day = date.getDate().toString().padStart(2, '0');

      return {
        period: `${year}-${month}-${day}`,
        opportunities: report.scores.overall.opportunities,
        challenges: report.scores.overall.challenges,
      };
    });
  }

  /**
   * Generate heatmap data for yearly report (monthly granularity)
   * TODO #10: Extract monthly scores from each monthly report
   */
  private static generateYearlyHeatmap(
    monthlyReports: FortuneReport[],
  ): FortuneReport['heatmapData'] {
    return monthlyReports.map((report) => {
      // Format as YYYY-MM for monthly scores
      const date = report.startDate;
      const year = date.getFullYear();
      const month = (date.getMonth() + 1).toString().padStart(2, '0');

      return {
        period: `${year}-${month}`,
        opportunities: report.scores.overall.opportunities,
        challenges: report.scores.overall.challenges,
      };
    });
  }

  /**
   * Generate heatmap data for chapter report (yearly granularity)
   * TODO #11: Extract yearly scores from each yearly report
   */
  private static generateChapterHeatmap(
    yearlyReports: FortuneReport[],
  ): FortuneReport['heatmapData'] {
    return yearlyReports.map((report) => {
      // Format as YYYY for yearly scores
      const year = report.startDate.getFullYear();

      return {
        period: `${year}`,
        opportunities: report.scores.overall.opportunities,
        challenges: report.scores.overall.challenges,
      };
    });
  }

  // --- PRIVATE: TECHNICAL BASIS ---

  /**
   * Prepare simplified technical basis (raw facts only)
   * LLMContextBuilder will convert this to comprehensive narrative context
   */
  private static prepareTechnicalBasis(
    rawData: RawBaziData,
  ): FortuneReport['technicalBasis'] {
    return {
      dayMaster: rawData.natalStructure.personal,
      natalStructure: rawData.natalStructure,
      chartStrength: rawData.chartStrength, // TODO #5: Chart strength
      elementBalance: rawData.elementBalance, // TODO #6: Element balance
      periodContext: rawData.periodContext, // TODO #7: Period pillars
      luckEra: rawData.luckEra,
      favorableElements: rawData.favorableElements,
      periodElement: rawData.dailyElement,
      rawTriggers: rawData.lifeAreas,
    };
  }

  // --- PRIVATE: AGGREGATION HELPERS ---

  /**
   * Aggregate scores from multiple reports
   */
  /**
   * Aggregate scores from multiple reports (averages opportunities, challenges, net)
   */
  private static aggregateScores(
    reports: FortuneReport[],
    targetTimeframe?: 'yearly' | 'chapter',
  ): FortuneScores {
    if (reports.length === 0) {
      throw new Error('Cannot aggregate scores from empty reports array');
    }

    const sum = reports.reduce(
      (acc, report) => ({
        overall: {
          opportunities:
            acc.overall.opportunities + report.scores.overall.opportunities,
          challenges: acc.overall.challenges + report.scores.overall.challenges,
          net: acc.overall.net + report.scores.overall.net,
        },
        career: {
          opportunities:
            acc.career.opportunities + report.scores.career.opportunities,
          challenges: acc.career.challenges + report.scores.career.challenges,
          net: acc.career.net + report.scores.career.net,
        },
        wealth: {
          opportunities:
            acc.wealth.opportunities + report.scores.wealth.opportunities,
          challenges: acc.wealth.challenges + report.scores.wealth.challenges,
          net: acc.wealth.net + report.scores.wealth.net,
        },
        relationships: {
          opportunities:
            acc.relationships.opportunities +
            report.scores.relationships.opportunities,
          challenges:
            acc.relationships.challenges +
            report.scores.relationships.challenges,
          net: acc.relationships.net + report.scores.relationships.net,
        },
        wellness: {
          opportunities:
            acc.wellness.opportunities + report.scores.wellness.opportunities,
          challenges:
            acc.wellness.challenges + report.scores.wellness.challenges,
          net: acc.wellness.net + report.scores.wellness.net,
        },
        personalGrowth: {
          opportunities:
            acc.personalGrowth.opportunities +
            report.scores.personalGrowth.opportunities,
          challenges:
            acc.personalGrowth.challenges +
            report.scores.personalGrowth.challenges,
          net: acc.personalGrowth.net + report.scores.personalGrowth.net,
        },
      }),
      {
        overall: { opportunities: 0, challenges: 0, net: 0 },
        career: { opportunities: 0, challenges: 0, net: 0 },
        wealth: { opportunities: 0, challenges: 0, net: 0 },
        relationships: { opportunities: 0, challenges: 0, net: 0 },
        wellness: { opportunities: 0, challenges: 0, net: 0 },
        personalGrowth: { opportunities: 0, challenges: 0, net: 0 },
      },
    );

    const count = reports.length;

    // Calculate base averages
    const baseScores = {
      overall: {
        opportunities: sum.overall.opportunities / count,
        challenges: sum.overall.challenges / count,
        net: sum.overall.net / count,
      },
      career: {
        opportunities: sum.career.opportunities / count,
        challenges: sum.career.challenges / count,
        net: sum.career.net / count,
      },
      wealth: {
        opportunities: sum.wealth.opportunities / count,
        challenges: sum.wealth.challenges / count,
        net: sum.wealth.net / count,
      },
      relationships: {
        opportunities: sum.relationships.opportunities / count,
        challenges: sum.relationships.challenges / count,
        net: sum.relationships.net / count,
      },
      wellness: {
        opportunities: sum.wellness.opportunities / count,
        challenges: sum.wellness.challenges / count,
        net: sum.wellness.net / count,
      },
      personalGrowth: {
        opportunities: sum.personalGrowth.opportunities / count,
        challenges: sum.personalGrowth.challenges / count,
        net: sum.personalGrowth.net / count,
      },
    };

    // Apply timeframe-specific variance amplification
    if (targetTimeframe) {
      return this.applyTimeframeAmplification(
        baseScores,
        reports,
        targetTimeframe,
      );
    }

    // Round and return
    return {
      overall: {
        opportunities: Math.round(baseScores.overall.opportunities),
        challenges: Math.round(baseScores.overall.challenges),
        net: Math.round(baseScores.overall.net),
      },
      career: {
        opportunities: Math.round(baseScores.career.opportunities),
        challenges: Math.round(baseScores.career.challenges),
        net: Math.round(baseScores.career.net),
      },
      wealth: {
        opportunities: Math.round(baseScores.wealth.opportunities),
        challenges: Math.round(baseScores.wealth.challenges),
        net: Math.round(baseScores.wealth.net),
      },
      relationships: {
        opportunities: Math.round(baseScores.relationships.opportunities),
        challenges: Math.round(baseScores.relationships.challenges),
        net: Math.round(baseScores.relationships.net),
      },
      wellness: {
        opportunities: Math.round(baseScores.wellness.opportunities),
        challenges: Math.round(baseScores.wellness.challenges),
        net: Math.round(baseScores.wellness.net),
      },
      personalGrowth: {
        opportunities: Math.round(baseScores.personalGrowth.opportunities),
        challenges: Math.round(baseScores.personalGrowth.challenges),
        net: Math.round(baseScores.personalGrowth.net),
      },
    };
  }

  /**
   * Apply timeframe-specific variance amplification
   * Addresses the issue where averaging daily scores flattens variation at yearly/chapter level
   */
  /**
   * Apply timeframe-specific variance amplification with breakthrough/valley detection
   * Creates dramatic variance by detecting exceptional periods in child reports
   */
  private static applyTimeframeAmplification(
    baseScores: FortuneScores,
    childReports: FortuneReport[],
    timeframe: 'yearly' | 'chapter',
  ): FortuneScores {
    // Detect if THIS period is exceptional compared to siblings
    const isBreakthroughPeriod = this.detectBreakthroughPeriod(
      baseScores,
      childReports,
    );
    const isValleyPeriod = this.detectValleyPeriod(baseScores, childReports);

    // Base amplification factors
    // Yearly: Compensate for daily→yearly flattening
    // Chapter: Compensate for yearly→chapter flattening
    let amplificationFactor = timeframe === 'yearly' ? 1.2 : 1.35;

    // DRAMATIC multipliers for special periods
    if (isBreakthroughPeriod) {
      amplificationFactor *= 1.5; // +50% for breakthrough periods
    } else if (isValleyPeriod) {
      amplificationFactor *= 0.7; // -30% for valley periods
    }

    // Calculate overall volatility for additional boost
    const volatilityInfo = this.analyzeScoreVolatility(childReports);
    const volatilityMultiplier =
      1.0 + Math.min(volatilityInfo.standardDeviation / 25, 0.4); // Max +40%

    // Apply amplification to each category
    const categories = [
      'overall',
      'career',
      'wealth',
      'relationships',
      'wellness',
      'personalGrowth',
    ] as const;

    const amplified: FortuneScores = {} as any;

    for (const category of categories) {
      const base = baseScores[category];

      // Calculate THIS person's average baseline (not universal 75)
      const avgChildOpp =
        childReports.reduce(
          (sum, r) => sum + r.scores[category].opportunities,
          0,
        ) / childReports.length;
      const avgChildChal =
        childReports.reduce(
          (sum, r) => sum + r.scores[category].challenges,
          0,
        ) / childReports.length;

      // Amplify deviations from THIS PERSON'S average (not neutral 75)
      // This creates variance without inflating absolute values
      const opportunitiesDeviation =
        (base.opportunities - avgChildOpp) *
        amplificationFactor *
        volatilityMultiplier;
      const challengesDeviation =
        (base.challenges - avgChildChal) *
        amplificationFactor *
        volatilityMultiplier;

      // Apply amplification from personal baseline
      const opportunities = Math.round(avgChildOpp + opportunitiesDeviation);
      const challenges = Math.round(avgChildChal + challengesDeviation);

      // Clamp to reasonable ranges (40-110) as safety
      amplified[category] = {
        opportunities: Math.max(40, Math.min(110, opportunities)),
        challenges: Math.max(40, Math.min(110, challenges)),
        net: opportunities - challenges,
      };
    }

    return amplified;
  }

  /**
   * Detect if this period is a "breakthrough" (scores significantly above average)
   */
  private static detectBreakthroughPeriod(
    baseScores: FortuneScores,
    childReports: FortuneReport[],
  ): boolean {
    const avgOpp =
      childReports.reduce((sum, r) => sum + r.scores.overall.opportunities, 0) /
      childReports.length;
    const stdDev = Math.sqrt(
      childReports.reduce(
        (sum, r) => sum + Math.pow(r.scores.overall.opportunities - avgOpp, 2),
        0,
      ) / childReports.length,
    );

    // Breakthrough if current opportunities > average + 1 std dev
    return baseScores.overall.opportunities > avgOpp + stdDev;
  }

  /**
   * Detect if this period is a "valley" (scores significantly below average)
   */
  private static detectValleyPeriod(
    baseScores: FortuneScores,
    childReports: FortuneReport[],
  ): boolean {
    const avgOpp =
      childReports.reduce((sum, r) => sum + r.scores.overall.opportunities, 0) /
      childReports.length;
    const stdDev = Math.sqrt(
      childReports.reduce(
        (sum, r) => sum + Math.pow(r.scores.overall.opportunities - avgOpp, 2),
        0,
      ) / childReports.length,
    );

    // Valley if current opportunities < average - 1 std dev
    return baseScores.overall.opportunities < avgOpp - stdDev;
  }

  /**
   * Aggregate lucky symbols with frequency weighting
   * Top symbols are those appearing most frequently
   */
  private static aggregateLuckySymbols(
    reports: FortuneReport[],
  ): FortuneReport['luckySymbols'] {
    const numberFreq = new Map<number, number>();
    const colorFreq = new Map<string, number>();
    const directionFreq = new Map<string, number>();

    for (const report of reports) {
      report.luckySymbols.numbers.forEach((n) =>
        numberFreq.set(n, (numberFreq.get(n) || 0) + 1),
      );
      report.luckySymbols.colors.forEach((c) =>
        colorFreq.set(c, (colorFreq.get(c) || 0) + 1),
      );
      report.luckySymbols.directions.forEach((d) =>
        directionFreq.set(d, (directionFreq.get(d) || 0) + 1),
      );
    }

    // Sort by frequency and take top N
    const numbersWithFreq = Array.from(numberFreq.entries())
      .map(([number, frequency]) => ({
        number,
        frequency,
        percentage: Math.round((frequency / reports.length) * 100),
      }))
      .sort((a, b) => b.frequency - a.frequency);

    const colorsWithFreq = Array.from(colorFreq.entries())
      .map(([color, frequency]) => ({
        color,
        frequency,
        percentage: Math.round((frequency / reports.length) * 100),
      }))
      .sort((a, b) => b.frequency - a.frequency);

    return {
      numbers: numbersWithFreq.slice(0, 5).map((n) => n.number),
      colors: colorsWithFreq.slice(0, 3).map((c) => c.color),
      directions: Array.from(directionFreq.keys()).slice(0, 2),
      numbersWithFrequency: numbersWithFreq.slice(0, 10), // Top 10 with frequency
      colorsWithFrequency: colorsWithFreq.slice(0, 5), // Top 5 with frequency
    };
  }

  /**
   * Aggregate special stars with period clustering
   * Shows when each star is active and for how long
   */
  private static aggregateSpecialStars(
    reports: FortuneReport[],
  ): FortuneReport['specialStars'] {
    const starMap = new Map<
      string,
      {
        name: string;
        chineseName: string;
        description: string;
        affectedCategories: Array<
          'career' | 'wealth' | 'relationships' | 'wellness' | 'personalGrowth'
        >;
        periods: Array<{ start: Date; end: Date; reports: FortuneReport[] }>;
      }
    >();

    // Collect all unique stars
    for (const report of reports) {
      for (const star of report.specialStars) {
        if (!starMap.has(star.name)) {
          starMap.set(star.name, {
            name: star.name,
            chineseName: star.chineseName,
            description: star.description,
            affectedCategories: star.affectedCategories,
            periods: [],
          });
        }
      }
    }

    // Find consecutive periods for each star
    for (const [starName, starData] of starMap.entries()) {
      const periods = this.findConsecutivePeriods(reports, (report) =>
        report.specialStars.some((s) => s.name === starName),
      );

      // Filter: Only keep periods longer than 7 days (significant)
      starData.periods = periods.filter(
        (p) => this.daysBetween(p.start, p.end) >= 7,
      );
    }

    // Convert to final format and filter out stars with no significant periods
    return Array.from(starMap.values())
      .filter((star) => star.periods.length > 0)
      .map((star) => {
        const totalActiveDays = star.periods.reduce(
          (sum, p) => sum + this.daysBetween(p.start, p.end),
          0,
        );

        return {
          name: star.name,
          chineseName: star.chineseName,
          description: star.description,
          affectedCategories: star.affectedCategories,
          activePeriods: star.periods.map((p) => {
            const periodIndex = reports.findIndex(
              (r) => r.startDate.getTime() === p.start.getTime(),
            );
            const phase =
              periodIndex < reports.length / 3
                ? ('Early' as const)
                : periodIndex < (reports.length * 2) / 3
                  ? ('Mid' as const)
                  : ('Late' as const);

            return {
              startDate: p.start,
              endDate: p.end,
              durationDays: this.daysBetween(p.start, p.end),
              phase,
            };
          }),
          totalActiveDays,
          activePercentage: Math.round(
            (totalActiveDays / reports.length) * 100,
          ),
        };
      });
  }

  /**
   * Aggregate technical basis (merge from first report)
   */
  private static aggregateTechnicalBasis(
    reports: FortuneReport[],
  ): FortuneReport['technicalBasis'] {
    if (reports.length === 0) {
      throw new Error(
        'Cannot aggregate technical basis from empty reports array',
      );
    }

    const firstBasis = reports[0].technicalBasis;

    // Detect Luck Era (大運/대운) transitions in the range
    const luckEraChanges: Array<{
      luckEra: typeof firstBasis.luckEra;
      startDate: Date;
      endDate: Date;
      daysInPeriod: number;
      isPreLuckEra: boolean; // True if no luck era active yet
    }> = [];

    let currentLuckEra = firstBasis.luckEra;
    let currentStartDate = reports[0].startDate;
    let currentDayCount = 0;
    let firstValidLuckEraFound = false; // Track if we've entered first Luck Era

    for (const report of reports) {
      const reportLuckEra = report.technicalBasis.luckEra;

      // 🔧 DATA QUALITY FIX: Forward fill strategy
      // If we encounter NULL after finding a valid Luck Era, treat it as "no data"
      // and keep using the current Luck Era (don't count as transition)
      if (reportLuckEra === null && firstValidLuckEraFound) {
        // Sporadic NULL - skip it, keep current luck era
        currentDayCount++;
        continue;
      }

      // Track when we first enter a Luck Era (exit pre-Luck Era period)
      if (reportLuckEra !== null && !firstValidLuckEraFound) {
        firstValidLuckEraFound = true;
      }

      // Check if luck era changed
      // Handle null → non-null (entering first 대운)
      // Handle non-null → different non-null (normal transition)
      const luckEraChanged =
        (currentLuckEra === null && reportLuckEra !== null) ||
        (currentLuckEra !== null &&
          reportLuckEra !== null &&
          (reportLuckEra.tenGod !== currentLuckEra.tenGod ||
            reportLuckEra.stemElement !== currentLuckEra.stemElement));

      if (luckEraChanged) {
        // Save previous luck era period
        luckEraChanges.push({
          luckEra: currentLuckEra,
          startDate: currentStartDate,
          endDate: report.startDate,
          daysInPeriod: currentDayCount,
          isPreLuckEra: currentLuckEra === null,
        });

        // Start new luck era period
        currentLuckEra = reportLuckEra;
        currentStartDate = report.startDate;
        currentDayCount = 1;
      } else {
        currentDayCount++;
      }
    }

    // Add final luck era period
    luckEraChanges.push({
      luckEra: currentLuckEra,
      startDate: currentStartDate,
      endDate: reports[reports.length - 1].endDate,
      daysInPeriod: currentDayCount,
      isPreLuckEra: currentLuckEra === null,
    });

    // 🔧 DATA QUALITY FIX: Filter out very short "transitions" (< 6 months)
    // These are likely data quality issues, not real Luck Era changes
    const MIN_TRANSITION_DAYS = 180; // ~6 months
    const realTransitions = luckEraChanges.filter(
      (change) => change.daysInPeriod >= MIN_TRANSITION_DAYS,
    );

    // If only one luck era throughout, don't include transitions array
    const hasRealTransitions = realTransitions.length > 1;

    return {
      dayMaster: firstBasis.dayMaster,
      natalStructure: firstBasis.natalStructure,
      chartStrength: firstBasis.chartStrength, // TODO #5: Chart strength (constant across periods)
      elementBalance: firstBasis.elementBalance, // TODO #6: Element balance (constant across periods)
      periodContext: firstBasis.periodContext, // TODO #7: Period pillars (first day as representative)
      luckEra: firstBasis.luckEra, // Primary (first) luck era
      ...(hasRealTransitions && { luckEraTransitions: realTransitions }),
      favorableElements: firstBasis.favorableElements,
      periodElement: firstBasis.periodElement,
      rawTriggers: firstBasis.rawTriggers,
    };
  }

  // --- PRIVATE: TREND DATA ---

  // --- PRIVATE: PHASE ANALYSIS ---

  /**
   * Generate phase analysis (Early/Mid/Late) with normalized metrics
   *
   * Normalization Strategy:
   * - All metrics calculated per unit (day/month/year)
   * - Scores averaged across phase
   * - Interactions counted per unit to avoid bias from phase length
   * - Lucky symbols deduplicated
   */
  private static generatePhaseAnalysis(
    reports: FortuneReport[],
    timeframe: 'monthly' | 'yearly' | 'chapter',
  ): import('../types').PhaseAnalysis[] {
    const totalUnits = reports.length;

    // Skip phase analysis if too few data points
    if (totalUnits < 3) {
      return [];
    }

    // Ensure minimum phase size of 1
    const phaseSize = Math.max(1, Math.floor(totalUnits / 3));

    const phases: Array<{
      name: 'Early' | 'Mid' | 'Late';
      reports: FortuneReport[];
    }> = [
      { name: 'Early', reports: reports.slice(0, phaseSize) },
      { name: 'Mid', reports: reports.slice(phaseSize, phaseSize * 2) },
      { name: 'Late', reports: reports.slice(phaseSize * 2) }, // Includes remainder
    ];

    return phases.map(({ name, reports: phaseReports }) => {
      const unitCount = phaseReports.length;

      // Calculate average scores (normalized)
      const avgScores = this.aggregateScores(phaseReports);

      // Count total interactions
      const totalInteractions = phaseReports.reduce((sum, report) => {
        let count = 0;
        const rawTriggers = report.technicalBasis.rawTriggers;
        Object.values(rawTriggers).forEach((area) => {
          if (area.active) {
            count += area.triggers.length;
          }
        });
        return sum + count;
      }, 0);

      // Count favorable/unfavorable interactions
      const interactionBreakdown = phaseReports.reduce(
        (acc, report) => {
          const rawTriggers = report.technicalBasis.rawTriggers;
          Object.values(rawTriggers).forEach((area) => {
            if (area.active) {
              area.triggers.forEach((trigger) => {
                if (trigger.involvesFavorable) acc.favorable++;
                if (trigger.involvesUnfavorable) acc.unfavorable++;
                if (!trigger.involvesFavorable && !trigger.involvesUnfavorable)
                  acc.neutral++;
              });
            }
          });
          return acc;
        },
        { favorable: 0, unfavorable: 0, neutral: 0 },
      );

      // Count significant units (high opportunities OR challenges)
      const significantUnits = phaseReports.filter((report) => {
        const overall = report.scores.overall;
        return overall.opportunities > 75 || overall.challenges > 75;
      }).length;

      // Deduplicate lucky symbols
      const luckyNumbers = Array.from(
        new Set(phaseReports.flatMap((report) => report.luckySymbols.numbers)),
      );
      const luckyColors = Array.from(
        new Set(phaseReports.flatMap((report) => report.luckySymbols.colors)),
      );
      const luckyDirections = Array.from(
        new Set(
          phaseReports.flatMap((report) => report.luckySymbols.directions),
        ),
      );

      // Characterize phase
      const characterization = this.characterizePhase(phaseReports, timeframe);

      return {
        phase: name,
        units: unitCount,
        avgScores,
        avgInteractionsPerUnit: totalInteractions / unitCount,
        interactionBreakdown: {
          favorable: interactionBreakdown.favorable / unitCount,
          unfavorable: interactionBreakdown.unfavorable / unitCount,
          neutral: interactionBreakdown.neutral / unitCount,
        },
        significantUnits,
        significantUnitRatio: significantUnits / unitCount,
        luckySymbols: {
          numbers: luckyNumbers,
          colors: luckyColors,
          directions: luckyDirections,
        },
        characterization,
      };
    });
  }

  /**
   * Format phase label based on timeframe
   */
  /**
   * Characterize phase based on scores and patterns
   */
  private static characterizePhase(
    reports: FortuneReport[],
    timeframe: 'monthly' | 'yearly' | 'chapter',
  ): import('../types').PhaseAnalysis['characterization'] {
    const avgScores = this.aggregateScores(reports);
    const netScores = reports.map((r) => r.scores.overall.net);
    const avgNet = avgScores.overall.net;

    // Calculate variance (volatility)
    const mean = netScores.reduce((a, b) => a + b, 0) / netScores.length;
    const variance =
      netScores.reduce((sum, score) => sum + Math.pow(score - mean, 2), 0) /
      netScores.length;

    // High opportunities + high challenges = volatile
    if (
      avgScores.overall.opportunities > 70 &&
      avgScores.overall.challenges > 70
    ) {
      return 'volatile';
    }

    // High variance = volatile
    if (variance > 200) {
      return 'volatile';
    }

    // High net = peak
    if (avgNet > 75) {
      return 'peak';
    }

    // Low net = challenging
    if (avgNet < 30) {
      return 'challenging';
    }

    // Low variance = stable
    if (variance < 50) {
      return 'stable';
    }

    // For chapter timeframe, use life-phase specific characterizations
    if (timeframe === 'chapter') {
      if (avgNet > 60) return 'emergence';
      if (avgNet > 50) return 'growth';
      if (avgNet < 40) return 'foundation';
    }

    // Default
    return 'moderate';
  }

  // --- PRIVATE: PERIOD DETECTION ---

  /**
   * Detect significant periods (consecutive days/months/years with high/low scores)
   *
   * PRD: "Days 10-15: High career opportunity window"
   */

  /**
   * TODO #4: Build chart identity (combines facts + themes)
   * Creates a comprehensive personality/chart overview for LLM consumption
   */
  static buildChartIdentity(
    dailyReports: FortuneReport[],
    rawData: RawBaziData, // First day's raw data for chart facts
    birthYear: number,
  ): ChartIdentity {
    // Extract major themes
    const majorThemes = this.detectMajorThemes(dailyReports, birthYear);

    // Build Day Master info
    const dayMaster = {
      element: rawData.natalStructure.personal.element,
      yinYang: rawData.natalStructure.personal.yinYang,
    };

    // Build Chart Strength interpretation
    const chartStrength = rawData.chartStrength
      ? {
          strength: rawData.chartStrength.strength,
          score: rawData.chartStrength.score,
          interpretation: this.interpretChartStrength(
            rawData.chartStrength,
            dayMaster.element,
          ),
        }
      : {
          strength: 'Balanced' as const,
          score: 0,
          interpretation: 'Chart strength data not available.',
        };

    // Build Element Balance interpretation
    const elementBalance = rawData.elementBalance
      ? this.interpretElementBalance(rawData.elementBalance, dayMaster.element)
      : {
          dominant: [],
          abundant: [],
          balanced: [],
          weak: [],
          lacking: [],
          interpretation: 'Element balance data not available.',
        };

    return {
      dayMaster,
      chartStrength,
      elementBalance,
      majorThemes,
    };
  }

  /**
   * Helper: Interpret chart strength for human consumption
   */
  private static interpretChartStrength(
    strength: NonNullable<RawBaziData['chartStrength']>,
    dayMasterElement: ElementType,
  ): string {
    const adjective =
      strength.strength === 'Strong'
        ? 'strong and resilient'
        : strength.strength === 'Weak'
          ? 'sensitive and adaptable'
          : 'balanced';

    return `You are ${adjective} ${dayMasterElement} (Day Master). ${strength.strength} charts ${strength.strength === 'Strong' ? "have robust internal support and don't need much external help" : strength.strength === 'Weak' ? 'thrive with external support and collaboration' : 'maintain equilibrium between independence and collaboration'}.`;
  }

  /**
   * Helper: Interpret element balance for human consumption
   */
  private static interpretElementBalance(
    balance: NonNullable<RawBaziData['elementBalance']>,
    dayMasterElement: ElementType,
  ): ChartIdentity['elementBalance'] {
    const elements: Array<{ element: ElementType; count: number }> = [
      { element: 'WOOD', count: balance.WOOD },
      { element: 'FIRE', count: balance.FIRE },
      { element: 'EARTH', count: balance.EARTH },
      { element: 'METAL', count: balance.METAL },
      { element: 'WATER', count: balance.WATER },
    ];

    const dominant = elements.filter((e) => e.count >= 30);
    const abundant = elements.filter((e) => e.count >= 15 && e.count < 30);
    const balanced = elements.filter((e) => e.count >= 5 && e.count < 15);
    const weak = elements.filter((e) => e.count > 0 && e.count < 5);
    const lacking = elements.filter((e) => e.count === 0).map((e) => e.element);

    // Build interpretation
    let interpretation = `Your chart has `;
    if (dominant.length > 0) {
      interpretation += `DOMINANT ${dominant.map((e) => e.element).join('/')} (${dominant.map((e) => e.count).join('/')} occurrences), creating intense ${dominant[0].element === dayMasterElement ? 'self-reinforcement' : 'external pressure'}. `;
    }
    if (abundant.length > 0) {
      interpretation += `Abundant ${abundant.map((e) => e.element).join('/')}. `;
    }
    if (weak.length > 0) {
      interpretation += `Weak ${weak.map((e) => e.element).join('/')}. `;
    }
    if (lacking.length > 0) {
      interpretation += `Lacking ${lacking.join('/')} entirely. `;
    }

    return {
      dominant,
      abundant,
      balanced,
      weak,
      lacking,
      interpretation: interpretation.trim(),
    };
  }

  /**
   * TODO #3: Detect major themes (contextualized pattern mining)
   * Mines multi-dimensional patterns from daily reports to identify
   * connected, significant patterns that form the person's "chart personality"
   *
   * This provides data for the "Chart Interaction" / "Who You Are" section
   *
   * @param dailyReports - Array of daily FortuneReport objects
   * @param birthYear - Birth year for context
   * @returns MajorTheme array with contextualized patterns
   */
  static detectMajorThemes(
    dailyReports: FortuneReport[],
    birthYear: number,
  ): Array<{
    pattern: {
      tenGod: string | null;
      interactionType: string | null;
      element: string | null;
      lifeArea: 'social' | 'career' | 'personal' | 'innovation';
      favorable: boolean;
      unfavorable: boolean;
      mixed: boolean; // NEW: Both favorable AND unfavorable
    };
    frequency: number;
    percentage: number;
    yearSpread: number;
    years: number[];
    significance: 'very-high' | 'high' | 'medium';
    label: string;
    interpretation: string;
  }> {
    // Step 1: Mine all pattern occurrences
    const patternOccurrences: Map<
      string,
      {
        pattern: any;
        count: number;
        years: Set<number>;
        dailyOccurrences: Date[];
      }
    > = new Map();

    for (const daily of dailyReports) {
      const date = daily.startDate;
      const year = date.getFullYear();
      const basis = daily.technicalBasis;

      // Extract interactions from rawTriggers
      const interactions = basis.rawTriggers;

      // Generate patterns for each active interaction
      for (const [lifeArea, data] of Object.entries(interactions)) {
        if (!data.active) continue;

        for (const trigger of data.triggers) {
          // FIX #1: Extract Ten God from trigger's affectedTenGods (not Luck Era)
          const tenGod = trigger.affectedTenGods?.[0] || null; // First affected Ten God

          // FIX #2: Categorize favorability (both=mixed, not neutral!)
          let favorability: 'favorable' | 'unfavorable' | 'mixed' | 'neutral';
          if (trigger.involvesFavorable && trigger.involvesUnfavorable) {
            // BOTH favorable and unfavorable = complex/mixed energy
            favorability = 'mixed';
          } else if (trigger.involvesFavorable) {
            // Only favorable
            favorability = 'favorable';
          } else if (trigger.involvesUnfavorable) {
            // Only unfavorable
            favorability = 'unfavorable';
          } else {
            // Neither (rare)
            favorability = 'neutral';
          }

          // FIX #3: Simplify pattern key - remove element (aggregate across elements)
          const patternKey = [
            tenGod || 'none',
            trigger.type,
            lifeArea,
            favorability,
          ].join('|');

          if (!patternOccurrences.has(patternKey)) {
            patternOccurrences.set(patternKey, {
              pattern: {
                tenGod,
                interactionType: trigger.type,
                element: null, // Aggregated across elements
                lifeArea: lifeArea as any,
                favorable: favorability === 'favorable',
                unfavorable: favorability === 'unfavorable',
                mixed: favorability === 'mixed', // NEW: Track mixed energy
              },
              count: 0,
              years: new Set(),
              dailyOccurrences: [],
            });
          }

          const entry = patternOccurrences.get(patternKey)!;
          entry.count++;
          entry.years.add(year);
          entry.dailyOccurrences.push(date);
        }
      }
    }

    // Step 2: Filter to significant patterns
    const totalDays = dailyReports.length;
    const significantPatterns = Array.from(patternOccurrences.entries())
      .map(([key, data]) => ({
        key,
        ...data,
        percentage: (data.count / totalDays) * 100,
        yearSpread: data.years.size,
        years: Array.from(data.years),
      }))
      .filter((p) => this.isSignificantPattern(p, totalDays));

    // Step 3: Sort by frequency and take top 8
    const topPatterns = significantPatterns
      .sort((a, b) => b.count - a.count)
      .slice(0, 8);

    // Step 4: Generate human-readable labels and interpretations
    return topPatterns.map((p) => {
      const { label, interpretation } = this.generatePatternLabel(p.pattern);

      // Determine significance level
      let significance: 'very-high' | 'high' | 'medium';
      if (p.percentage >= 10) {
        significance = 'very-high';
      } else if (p.percentage >= 5) {
        significance = 'high';
      } else {
        significance = 'medium';
      }

      return {
        pattern: p.pattern,
        frequency: p.count,
        percentage: p.percentage,
        yearSpread: p.yearSpread,
        years: p.years,
        significance,
        label,
        interpretation,
      };
    });
  }

  /**
   * Helper: Determine if a pattern is significant enough to keep
   */
  private static isSignificantPattern(
    pattern: {
      count: number;
      percentage: number;
      yearSpread: number;
      pattern: any;
    },
    totalDays: number,
  ): boolean {
    // Rule 1: High frequency (>5% of period)
    if (pattern.percentage >= 5) return true;

    // Rule 2: Clustered in specific years (even if rare overall)
    // If appears >10 times per year and spans 3+ years
    const density = pattern.count / pattern.yearSpread;
    if (density > 10 && pattern.yearSpread >= 3) return true;

    // Rule 3: Involves favorable/unfavorable elements (lower threshold)
    if (pattern.pattern.favorable || pattern.pattern.unfavorable) {
      if (pattern.percentage >= 3) return true;
    }

    return false; // Noise - filter out
  }

  /**
   * Helper: Generate human-readable label and interpretation for a pattern
   */
  private static generatePatternLabel(pattern: {
    tenGod: string | null;
    interactionType: string | null;
    element: string | null;
    lifeArea: string;
    favorable: boolean;
    unfavorable: boolean;
    mixed?: boolean; // NEW: Mixed energy
  }): { label: string; interpretation: string } {
    // Simplify life area names
    const lifeAreaMap: Record<string, string> = {
      social: 'Social',
      career: 'Career',
      personal: 'Personal',
      innovation: 'Innovation',
    };

    const area = lifeAreaMap[pattern.lifeArea] || pattern.lifeArea;

    // Determine tone based on favorability
    let tone: string;
    let toneEmoji: string;
    if (pattern.mixed) {
      // NEW: Complex/mixed energy (both favorable + unfavorable)
      tone = 'complex';
      toneEmoji = '⚖️';
    } else if (pattern.favorable) {
      tone = 'supportive';
      toneEmoji = '✨';
    } else if (pattern.unfavorable) {
      tone = 'challenging';
      toneEmoji = '⚡';
    } else {
      tone = 'active';
      toneEmoji = '🔄';
    }

    // Build label (simplified, no element)
    const parts = [];
    if (pattern.tenGod) parts.push(pattern.tenGod);
    if (pattern.interactionType) parts.push(pattern.interactionType);
    parts.push(`${area} (${tone})`);

    const label = parts.join(' + ');

    // Build interpretation
    let interpretation = `${toneEmoji} This pattern shows ${tone} energy in your ${area.toLowerCase()} life`;

    if (pattern.tenGod) {
      interpretation += `, characterized by ${pattern.tenGod} dynamics`;
    }

    if (pattern.interactionType) {
      interpretation += ` through ${pattern.interactionType} interactions`;
    }

    interpretation += '.';

    return { label, interpretation };
  }

  /**
   * TODO #2: Detect significant years (for chapter reports)
   * Analyzes each year individually to identify distinct top categories
   *
   * This fixes the "same category" problem by analyzing year-level data
   * instead of phase-level aggregations
   *
   * @param yearlyReports - Array of yearly FortuneReport objects (typically 20 years)
   * @param birthDate - Birth date for age calculation
   * @returns Array of significant year data with year-specific top categories
   */
  static detectSignificantYears(
    yearlyReports: FortuneReport[],
    birthDate: Date,
  ): Array<{
    year: number;
    age: number;
    intensity: number; // opportunities + challenges (0-200)
    type: 'peak' | 'challenging' | 'volatile';
    topCategories: Array<{
      name:
        | 'career'
        | 'wealth'
        | 'relationships'
        | 'wellness'
        | 'personalGrowth';
      opportunities: number;
      challenges: number;
      intensity: number;
    }>;
    scores: {
      opportunities: number;
      challenges: number;
      net: number;
    };
  }> {
    const birthYear = birthDate.getFullYear();

    // Step 1: Analyze each year individually
    const yearAnalyses = yearlyReports.map((report) => {
      const year = report.startDate.getFullYear();
      const age = year - birthYear;
      const overall = report.scores.overall;

      // Calculate intensity (total activity level)
      const intensity = overall.opportunities + overall.challenges;

      // Determine type
      const isHighOpportunities = overall.opportunities > 70;
      const isHighChallenges = overall.challenges > 70;

      let type: 'peak' | 'challenging' | 'volatile';
      if (isHighOpportunities && isHighChallenges) {
        type = 'volatile';
      } else if (isHighOpportunities) {
        type = 'peak';
      } else {
        type = 'challenging';
      }

      // Get top 2 categories by intensity (opportunities + challenges)
      const categories = [
        { name: 'career' as const, ...report.scores.career },
        { name: 'wealth' as const, ...report.scores.wealth },
        { name: 'relationships' as const, ...report.scores.relationships },
        { name: 'wellness' as const, ...report.scores.wellness },
        { name: 'personalGrowth' as const, ...report.scores.personalGrowth },
      ];

      const topCategories = categories
        .map((cat) => ({
          ...cat,
          intensity: cat.opportunities + cat.challenges,
        }))
        .sort((a, b) => b.intensity - a.intensity)
        .slice(0, 2); // Top 2 categories

      return {
        year,
        age,
        intensity,
        type,
        topCategories,
        scores: {
          opportunities: overall.opportunities,
          challenges: overall.challenges,
          net: overall.net,
        },
      };
    });

    // Step 2: Sort by intensity and take top 8-10
    const sorted = yearAnalyses.sort((a, b) => b.intensity - a.intensity);

    // Take top 8 years (40% of a 20-year chapter)
    const significantYears = sorted.slice(0, 8);

    // Sort by year (chronological) for output
    return significantYears.sort((a, b) => a.year - b.year);
  }

  /**
   * Detect significant periods using two-score system
   *
   * Significance = High Opportunities OR High Challenges
   * - opportunities > 75: Major favorable period
   * - challenges > 75: Major challenging period
   * - both > 75: Volatile/intense period
   */
  private static detectSignificantPeriods(
    reports: FortuneReport[],
    granularity: 'daily' | 'monthly' | 'yearly',
  ): FortuneReport['significantPeriods'] {
    const periods: FortuneReport['significantPeriods'] = [];
    const THRESHOLD = 75; // Top 25% = significant

    let windowStart: number | null = null;
    let windowType: 'peak' | 'challenging' | 'volatile' | null = null;
    let dominantCategory:
      | 'career'
      | 'wealth'
      | 'relationships'
      | 'wellness'
      | 'personalGrowth'
      | null = null;

    for (let i = 0; i < reports.length; i++) {
      const report = reports[i];
      const overall = report.scores.overall;

      // Determine if this period is significant
      const isHighOpportunities = overall.opportunities > THRESHOLD;
      const isHighChallenges = overall.challenges > THRESHOLD;
      const isSignificant = isHighOpportunities || isHighChallenges;

      // Determine type
      let currentType: 'peak' | 'challenging' | 'volatile' | null = null;
      if (isSignificant) {
        if (isHighOpportunities && isHighChallenges) {
          currentType = 'volatile'; // Both high = intense
        } else if (isHighOpportunities) {
          currentType = 'peak'; // High opportunities
        } else {
          currentType = 'challenging'; // High challenges
        }
      }

      // Start a new window if significant
      if (isSignificant && windowStart === null) {
        windowStart = i;
        windowType = currentType;
        dominantCategory = this.identifyDominantCategory([report]);
      }
      // Continue current window if same type
      else if (
        isSignificant &&
        windowStart !== null &&
        currentType === windowType
      ) {
        // Extend window
        continue;
      }
      // End current window
      else if (!isSignificant && windowStart !== null) {
        const windowEnd = i - 1;

        // Only add if window is at least 2 units (avoid single-day blips)
        if (windowEnd - windowStart >= 1 && windowType && dominantCategory) {
          const windowReports = reports.slice(windowStart, windowEnd + 1);
          const avgScores = this.aggregateScores(windowReports);

          periods.push({
            startDate: windowReports[0].startDate,
            endDate: windowReports[windowReports.length - 1].endDate,
            category: dominantCategory,
            type: windowType,
            description: this.describePeriod(
              windowType,
              dominantCategory,
              avgScores,
            ),
          });
        }

        // Reset window
        windowStart = null;
        windowType = null;
        dominantCategory = null;
      }
    }

    // Handle window that extends to end
    if (windowStart !== null && windowType && dominantCategory) {
      const windowReports = reports.slice(windowStart);
      if (windowReports.length >= 2) {
        const avgScores = this.aggregateScores(windowReports);
        periods.push({
          startDate: windowReports[0].startDate,
          endDate: windowReports[windowReports.length - 1].endDate,
          category: dominantCategory,
          type: windowType,
          description: this.describePeriod(
            windowType,
            dominantCategory,
            avgScores,
          ),
        });
      }
    }

    return periods;
  }

  /**
   * Identify dominant category (highest average net score)
   */
  private static identifyDominantCategory(
    reports: FortuneReport[],
  ): 'career' | 'wealth' | 'relationships' | 'wellness' | 'personalGrowth' {
    const avgScores = this.aggregateScores(reports);

    const categories: Array<{
      name:
        | 'career'
        | 'wealth'
        | 'relationships'
        | 'wellness'
        | 'personalGrowth';
      score: number;
    }> = [
      { name: 'career', score: avgScores.career.net },
      { name: 'wealth', score: avgScores.wealth.net },
      { name: 'relationships', score: avgScores.relationships.net },
      { name: 'wellness', score: avgScores.wellness.net },
      { name: 'personalGrowth', score: avgScores.personalGrowth.net },
    ];

    categories.sort((a, b) => b.score - a.score);
    return categories[0].name;
  }

  /**
   * Describe period based on type and category
   */
  private static describePeriod(
    type: 'peak' | 'challenging' | 'volatile',
    category:
      | 'career'
      | 'wealth'
      | 'relationships'
      | 'wellness'
      | 'personalGrowth',
    avgScores: FortuneScores,
  ): string {
    const categoryNames = {
      career: 'Career',
      wealth: 'Wealth',
      relationships: 'Relationships',
      wellness: 'Wellness',
      personalGrowth: 'Personal Growth',
    };

    const categoryScore = avgScores[category];

    if (type === 'peak') {
      return `Exceptional ${categoryNames[category].toLowerCase()} opportunities (${categoryScore.opportunities}/100 favorable influences)`;
    } else if (type === 'challenging') {
      return `${categoryNames[category]} challenges requiring careful navigation (${categoryScore.challenges}/100 unfavorable influences)`;
    } else {
      // volatile
      return `Highly eventful ${categoryNames[category].toLowerCase()} period (${categoryScore.opportunities}/100 opportunities, ${categoryScore.challenges}/100 challenges)`;
    }
  }

  /**
   * Detect turning points (major score shifts)
   *
   * PRD: For chapter reports - major life changes
   */

  // --- PRIVATE: FREQUENCY-BASED AGGREGATION HELPERS ---

  /**
   * Analyze score volatility from multiple reports
   * Preserves information lost in simple averaging
   */
  private static analyzeScoreVolatility(
    reports: FortuneReport[],
  ): FortuneReport['aggregationMetadata']['scoreVolatility'] {
    const netScores = reports.map((r) => r.scores.overall.net);

    // Calculate standard deviation
    const mean =
      netScores.reduce((sum, score) => sum + score, 0) / netScores.length;
    const variance =
      netScores.reduce((sum, score) => sum + Math.pow(score - mean, 2), 0) /
      netScores.length;
    const stdDev = Math.sqrt(variance);

    // Determine trend
    const firstHalf = netScores.slice(0, Math.floor(netScores.length / 2));
    const secondHalf = netScores.slice(Math.floor(netScores.length / 2));
    const firstAvg = firstHalf.reduce((a, b) => a + b, 0) / firstHalf.length;
    const secondAvg = secondHalf.reduce((a, b) => a + b, 0) / secondHalf.length;

    let trend: 'increasing' | 'decreasing' | 'stable' | 'volatile';
    if (stdDev > 20) {
      trend = 'volatile';
    } else if (secondAvg - firstAvg > 10) {
      trend = 'increasing';
    } else if (firstAvg - secondAvg > 10) {
      trend = 'decreasing';
    } else {
      trend = 'stable';
    }

    // Calculate quartiles
    const sorted = [...netScores].sort((a, b) => a - b);
    const q1Index = Math.floor(sorted.length * 0.25);
    const q3Index = Math.floor(sorted.length * 0.75);

    return {
      standardDeviation: Math.round(stdDev),
      min: Math.min(...netScores),
      max: Math.max(...netScores),
      trend,
      quartiles: {
        q1: sorted[q1Index],
        q3: sorted[q3Index],
      },
    };
  }

  /**
   * Analyze trigger patterns with frequency filtering
   * Removes noise (triggers appearing <5% of time)
   */
  private static analyzeTriggerPatterns(
    reports: FortuneReport[],
    frequencyThreshold: number = 5, // Minimum % of days
  ): {
    patterns: FortuneReport['aggregationMetadata']['triggerPatterns'];
    filteringApplied: FortuneReport['aggregationMetadata']['filteringApplied'];
  } {
    const triggerFrequency = new Map<
      string,
      {
        count: number;
        favorable: number;
        unfavorable: number;
        years: Set<number>;
        phases: Set<'Early' | 'Mid' | 'Late'>;
      }
    >();

    // Count trigger occurrences
    for (let i = 0; i < reports.length; i++) {
      const report = reports[i];
      const phase =
        i < reports.length / 3
          ? 'Early'
          : i < (reports.length * 2) / 3
            ? 'Mid'
            : 'Late';

      for (const area of Object.values(report.technicalBasis.rawTriggers)) {
        if (!area.active) continue;

        for (const trigger of area.triggers) {
          const key = trigger.type;
          if (!triggerFrequency.has(key)) {
            triggerFrequency.set(key, {
              count: 0,
              favorable: 0,
              unfavorable: 0,
              years: new Set(),
              phases: new Set(),
            });
          }

          const data = triggerFrequency.get(key)!;
          data.count++;
          if (trigger.involvesFavorable) data.favorable++;
          if (trigger.involvesUnfavorable) data.unfavorable++;
          data.years.add(report.startDate.getFullYear());
          data.phases.add(phase);
        }
      }
    }

    // Filter by frequency threshold
    const threshold = reports.length * (frequencyThreshold / 100);
    const totalUniqueTypes = triggerFrequency.size;

    const significantTriggers = Array.from(triggerFrequency.entries())
      .filter(([_, data]) => data.count >= threshold)
      .map(([type, data]) => ({
        type,
        frequency: data.count,
        percentage: Math.round((data.count / reports.length) * 100),
        favorableRatio:
          data.favorable + data.unfavorable === 0
            ? 0.5
            : data.favorable / (data.favorable + data.unfavorable),
        yearSpread: data.years.size,
        phase:
          data.phases.size === 3
            ? ('All' as const)
            : data.phases.size === 1
              ? Array.from(data.phases)[0]
              : undefined,
      }))
      .sort((a, b) => b.frequency - a.frequency);

    return {
      patterns: significantTriggers,
      filteringApplied: {
        totalUniqueTriggers: totalUniqueTypes,
        significantTriggers: significantTriggers.length,
        filteredOutTriggers: totalUniqueTypes - significantTriggers.length,
        frequencyThreshold,
      },
    };
  }

  /**
   * Find consecutive periods where a condition is true
   * Used for clustering special star activations
   */
  private static findConsecutivePeriods(
    reports: FortuneReport[],
    condition: (report: FortuneReport) => boolean,
  ): Array<{ start: Date; end: Date; reports: FortuneReport[] }> {
    const periods: Array<{ start: Date; end: Date; reports: FortuneReport[] }> =
      [];
    let currentPeriod: {
      start: Date;
      end: Date;
      reports: FortuneReport[];
    } | null = null;

    for (const report of reports) {
      if (condition(report)) {
        if (!currentPeriod) {
          // Start new period
          currentPeriod = {
            start: report.startDate,
            end: report.endDate,
            reports: [report],
          };
        } else {
          // Extend current period
          currentPeriod.end = report.endDate;
          currentPeriod.reports.push(report);
        }
      } else {
        // End current period if it exists
        if (currentPeriod) {
          periods.push(currentPeriod);
          currentPeriod = null;
        }
      }
    }

    // Don't forget the last period
    if (currentPeriod) {
      periods.push(currentPeriod);
    }

    return periods;
  }

  /**
   * Calculate days between two dates
   */
  private static daysBetween(start: Date, end: Date): number {
    const msPerDay = 1000 * 60 * 60 * 24;
    return Math.round((end.getTime() - start.getTime()) / msPerDay) + 1; // +1 to include both dates
  }
}
