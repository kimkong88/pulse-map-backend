import {
  CompleteAnalysis,
  PersonalizedDailyAnalysisOutput,
  GeneralDailyAnalysisOutput,
  InteractionDetail,
} from '@aharris02/bazi-calculator-by-alvamind';
import { RawBaziData, RawLifeArea, TriggerSource, UserContext } from '../types';
import { LIFE_AREAS } from '../saju.config';
import { PatternDetector } from './patternDetector.util';

/**
 * BaziDataExtractor
 *
 * Extracts and transforms data from @aharris02/bazi-calculator-by-alvamind library.
 *
 * DOES:
 * - Build UserContext once from CompleteAnalysis (natal characteristics)
 * - Extract temporal data from PersonalizedDailyAnalysisOutput
 * - Map traditional pillars (Year/Month/Day/Hour) to modern life areas (social/career/personal/innovation)
 * - Map interactions to affected life areas
 * - Pass through library data unchanged
 *
 * DOES NOT:
 * - Calculate Ten Gods (library already provides via heavenlyStemTenGod)
 * - Apply weighting/scoring (ViewAggregator's responsibility)
 * - Interpret significance (ViewAggregator's responsibility)
 *
 * Philosophy: 95% of data comes directly from library, 5% is simple mapping/transformation
 */
export class BaziDataExtractor {
  /**
   * Build user context from natal chart (CALL ONCE per user)
   *
   * Extracts fixed natal characteristics that never change:
   * - Natal structure (Four Pillars)
   * - Favorable elements
   * - Chart strength
   * - Element balance
   * - Special stars
   * - Natal patterns (to be implemented)
   *
   * @param base Complete natal chart analysis (from BaziCalculator.getCompleteAnalysis())
   * @returns UserContext (cacheable per user)
   */
  static buildUserContext(base: CompleteAnalysis): UserContext {
    if (!base.basicAnalysis) {
      throw new Error('BaziDataExtractor: Missing basicAnalysis in base');
    }
    if (!base.detailedPillars) {
      throw new Error('BaziDataExtractor: Missing detailedPillars in base');
    }

    // Build base context first
    const baseContext: UserContext = {
      // Natal structure (Four Pillars)
      natalStructure: this.extractNatalStructure(base),

      // Favorable elements
      favorableElements: this.extractFavorableElements(base),

      // Chart strength
      chartStrength: this.extractChartStrength(base),

      // Element balance
      elementBalance: this.extractElementBalance(base),

      // Special stars
      specialStars: this.extractSpecialStars(base),

      // Natal patterns (will be detected below)
      natalPatterns: [],
    };

    // Detect natal patterns (requires baseContext to be built first)
    baseContext.natalPatterns = PatternDetector.detectPatterns(baseContext);

    return baseContext;
  }

  /**
   * Extract raw Bazi data for a single day (CALL for each timeframe)
   *
   * @param userContext User's natal context (from buildUserContext())
   * @param daily Personalized daily analysis (from BaziCalculator.getAnalysisForDate())
   * @param general General daily analysis for annual/monthly pillars (optional - fetched if not provided)
   * @returns Raw Bazi data ready for view aggregation
   */
  static extract(
    userContext: UserContext,
    daily: PersonalizedDailyAnalysisOutput,
    general?: GeneralDailyAnalysisOutput,
  ): RawBaziData {
    // Validate inputs
    if (!daily?.dayPillar) {
      throw new Error('BaziDataExtractor: Missing dayPillar in daily');
    }

    const date = new Date(daily.date);
    if (Number.isNaN(date.getTime())) {
      throw new Error(
        `BaziDataExtractor: Invalid date string: ${String(daily.date)}`,
      );
    }

    return {
      date,

      // Luck Era context (temporal - from daily)
      luckEra: this.extractLuckEra(daily),

      // Natal structure (from userContext)
      natalStructure: userContext.natalStructure,

      // Chart strength (from userContext)
      chartStrength: userContext.chartStrength,

      // Element balance (from userContext)
      elementBalance: userContext.elementBalance,

      // Element favorability (from userContext)
      favorableElements: userContext.favorableElements,

      // Daily element (temporal - from daily)
      dailyElement: daily.dayPillar.stemElement,

      // Period interaction context (temporal - from daily + general)
      periodContext: this.extractPeriodContext(daily, general),

      // Interactions mapped to life areas (temporal - from daily)
      lifeAreas: this.mapInteractionsToLifeAreas(
        userContext,
        daily.interactions,
      ),

      // Special stars (from userContext)
      specialStars: userContext.specialStars,

      // Natal patterns (from userContext)
      natalPatterns: userContext.natalPatterns,
    };
  }

  // --- PRIVATE EXTRACTION METHODS ---

  private static extractLuckEra(
    daily: PersonalizedDailyAnalysisOutput,
  ): RawBaziData['luckEra'] {
    const snap = daily.currentLuckPillarSnap;

    if (!snap) {
      return null;
    }

    return {
      // Direct from library - no calculation
      tenGod: snap.tenGodVsNatalDayMaster?.name || null,
      stemElement: snap.stemElement,
      stemYinYang: snap.stemYinYang,
    };
  }

  private static extractNatalStructure(
    base: CompleteAnalysis,
  ): RawBaziData['natalStructure'] {
    const pillars = base.detailedPillars!;

    return {
      // All Ten Gods come directly from library (no calculation)
      social: {
        tenGod: pillars.year.heavenlyStemTenGod?.name || null,
        element: pillars.year.heavenlyStem.elementType,
        yinYang: pillars.year.heavenlyStem.yinYang,
        lifeCycle: pillars.year.lifeCycle || null, // 十二长生
        stem: pillars.year.heavenlyStem.character,
        branch: pillars.year.earthlyBranch.character,
      },
      career: {
        tenGod: pillars.month.heavenlyStemTenGod?.name || null,
        element: pillars.month.heavenlyStem.elementType,
        yinYang: pillars.month.heavenlyStem.yinYang,
        lifeCycle: pillars.month.lifeCycle || null, // 十二长生
        stem: pillars.month.heavenlyStem.character,
        branch: pillars.month.earthlyBranch.character,
      },
      personal: {
        // Day pillar = self, library correctly returns null
        tenGod: null,
        element: pillars.day.heavenlyStem.elementType,
        yinYang: pillars.day.heavenlyStem.yinYang,
        lifeCycle: pillars.day.lifeCycle || null, // 十二长生
        stem: pillars.day.heavenlyStem.character,
        branch: pillars.day.earthlyBranch.character,
      },
      innovation: pillars.hour
        ? {
            tenGod: pillars.hour.heavenlyStemTenGod?.name || null,
            element: pillars.hour.heavenlyStem.elementType,
            yinYang: pillars.hour.heavenlyStem.yinYang,
            lifeCycle: pillars.hour.lifeCycle || null, // 十二长生
            stem: pillars.hour.heavenlyStem.character,
            branch: pillars.hour.earthlyBranch.character,
          }
        : null,
    };
  }

  private static extractFavorableElements(
    base: CompleteAnalysis,
  ): RawBaziData['favorableElements'] {
    const favorable = base.basicAnalysis!.favorableElements;

    if (!favorable) {
      return null;
    }

    return {
      // Direct from library
      primary: favorable.primary || [],
      secondary: favorable.secondary || [],
      unfavorable: favorable.unfavorable || [],
    };
  }

  /**
   * TODO #5: Extract chart strength (Strong/Weak/Balanced) from library
   * This is a key characteristic that explains how the user responds to external energy
   */
  private static extractChartStrength(
    base: CompleteAnalysis,
  ): UserContext['chartStrength'] {
    const strength = base.basicAnalysis?.dayMasterStrength;

    if (!strength) {
      return null;
    }

    return {
      // Direct from library - no calculation
      strength: strength.strength,
      score: strength.score,
      notes: strength.notes, // Optional from library
    };
  }

  /**
   * TODO #6: Extract element balance (five factors) from library
   * Shows which elements are abundant or lacking in the natal chart
   */
  private static extractElementBalance(
    base: CompleteAnalysis,
  ): RawBaziData['elementBalance'] {
    const fiveFactors = base.basicAnalysis?.fiveFactors;

    if (!fiveFactors) {
      return null;
    }

    return {
      // Direct from library - no calculation
      WOOD: fiveFactors.WOOD,
      FIRE: fiveFactors.FIRE,
      EARTH: fiveFactors.EARTH,
      METAL: fiveFactors.METAL,
      WATER: fiveFactors.WATER,
    };
  }

  /**
   * Extract special stars (beneficial stars) from library
   * These provide lucky breaks, support, and opportunities
   */
  private static extractSpecialStars(
    base: CompleteAnalysis,
  ): RawBaziData['specialStars'] {
    const basicAnalysis = base.basicAnalysis;

    if (!basicAnalysis) {
      return null;
    }

    // Get all branches in the natal chart (Year, Month, Day, Hour)
    const pillars = base.detailedPillars;
    if (!pillars) {
      return null;
    }

    const chartBranches = new Set<string>([
      pillars.year.earthlyBranch.character,
      pillars.month.earthlyBranch.character,
      pillars.day.earthlyBranch.character,
    ]);

    if (pillars.hour) {
      chartBranches.add(pillars.hour.earthlyBranch.character);
    }

    // ROOTED-ONLY FILTERING: Stars must be BOTH calculated AND present in natal chart
    // This ensures we only show genuinely strong/rare configurations

    // Nobleman: Filter to branches that exist in chart
    const noblemanInChart = (basicAnalysis.nobleman || []).filter((branch) =>
      chartBranches.has(branch),
    );

    // Intelligence: Only if rooted (branch in chart)
    const intelligence =
      basicAnalysis.intelligence &&
      basicAnalysis.intelligence.trim() !== '' &&
      chartBranches.has(basicAnalysis.intelligence)
        ? basicAnalysis.intelligence
        : null;

    // Sky Horse: Only if rooted (branch in chart)
    const skyHorse =
      basicAnalysis.skyHorse &&
      basicAnalysis.skyHorse.trim() !== '' &&
      chartBranches.has(basicAnalysis.skyHorse)
        ? basicAnalysis.skyHorse
        : null;

    // Peach Blossom: Only if rooted (branch in chart)
    const peachBlossom =
      basicAnalysis.peachBlossom &&
      basicAnalysis.peachBlossom.trim() !== '' &&
      chartBranches.has(basicAnalysis.peachBlossom)
        ? basicAnalysis.peachBlossom
        : null;

    return {
      nobleman: noblemanInChart,
      intelligence,
      skyHorse,
      peachBlossom,
    };
  }

  /**
   * Extract period interaction context (how current time affects natal chart)
   * Provides annual/monthly/daily pillars for temporal analysis
   *
   * NOTE: Annual/monthly pillars come from GeneralDailyAnalysisOutput
   */
  private static extractPeriodContext(
    daily: PersonalizedDailyAnalysisOutput,
    general?: GeneralDailyAnalysisOutput,
  ): RawBaziData['periodContext'] {
    return {
      annualPillar: general?.annualPillarContext
        ? {
            element: general.annualPillarContext.stemElement,
            yinYang: general.annualPillarContext.stemYinYang,
            tenGod:
              general.annualPillarContext.tenGods?.vsYearStem?.name || null,
          }
        : null,
      monthlyPillar: general?.monthlyPillarContext
        ? {
            element: general.monthlyPillarContext.stemElement,
            yinYang: general.monthlyPillarContext.stemYinYang,
            tenGod:
              general.monthlyPillarContext.tenGods?.vsMonthStem?.name || null,
          }
        : null,
      dailyPillar: {
        element: daily.dayPillar.stemElement,
        yinYang: daily.dayPillar.stemYinYang,
        tenGod: null, // Day pillar is always Day Master (self), no Ten God
      },
    };
  }

  private static mapInteractionsToLifeAreas(
    userContext: UserContext,
    interactions: InteractionDetail[],
  ): RawBaziData['lifeAreas'] {
    // Initialize empty life areas
    const lifeAreas: RawBaziData['lifeAreas'] = {
      social: this.createEmptyArea('social'),
      career: this.createEmptyArea('career'),
      personal: this.createEmptyArea('personal'),
      innovation: this.createEmptyArea('innovation'),
    };

    // Map each interaction to affected life area(s)
    interactions.forEach((interaction) => {
      // Find natal participants to determine which life area is affected
      const natalParticipants = interaction.participants.filter(
        (p) => p.source === 'Natal',
      );

      natalParticipants.forEach((natalPart) => {
        const pillarKey = natalPart.pillar.toLowerCase();

        // Skip invalid pillar keys
        if (!['year', 'month', 'day', 'hour'].includes(pillarKey)) {
          return;
        }

        // Map pillar to life area (simple lookup)
        const areaKey = LIFE_AREAS[pillarKey as keyof typeof LIFE_AREAS];
        const area = lifeAreas[areaKey];

        // Mark area as active
        area.active = true;

        // Extract trigger source priority
        const triggerSource = this.determineTriggerSource(
          interaction.participants.map((p) => p.source),
        );

        if (!triggerSource) {
          return; // No external trigger
        }

        // Create raw trigger (no weighting - that's aggregator's job)
        // Use library's favorability flags directly

        // Library provides directional information via consequenceNotes

        area.triggers.push({
          type: interaction.type,
          source: triggerSource,
          description: interaction.description || interaction.type,
          involvesFavorable: interaction.involvesFavorableElement || false,
          involvesUnfavorable: interaction.involvesUnfavorableElement || false,
          affectedTenGods:
            interaction.affectedPillarStemsTenGods
              ?.map((tg) => tg?.name)
              .filter(Boolean) || [],
        });
      });
    });

    return lifeAreas;
  }

  private static determineTriggerSource(
    participantSources: string[],
  ): TriggerSource | null {
    // Priority: Daily > Monthly > Annual
    // (Daily events are most immediate/specific)
    if (participantSources.includes('Daily')) return 'Daily';
    if (participantSources.includes('Monthly')) return 'Monthly';
    if (participantSources.includes('Annual')) return 'Annual';

    // No external trigger (e.g., only Natal or Luck participants)
    return null;
  }

  private static createEmptyArea(key: string): RawLifeArea {
    return {
      key,
      active: false,
      triggers: [],
    };
  }
}
