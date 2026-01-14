import {
  CompleteAnalysis,
  ElementType,
  PersonalizedDailyAnalysisOutput,
} from '@aharris02/bazi-calculator-by-alvamind';
import {
  FortuneReport,
  LLMPromptContext,
  RawBaziData,
  ChartIdentity,
} from '../types';
import { PatternInterpreter } from './patternInterpreter.util';

/**
 * LLMContextBuilder - Converts raw FortuneReport data into comprehensive LLM narrative context
 *
 * Architecture:
 * - ViewAggregator: Scoring, aggregation, lucky symbols (pure business logic)
 * - LLMContextBuilder: Narrative explanations, traditional meanings (LLM preparation)
 *
 * Benefits:
 * - Separation of concerns (scoring vs narrative)
 * - Multi-LLM testing (same data, different prompts)
 * - Flexible prompt strategies (can A/B test explanations)
 * - Independent testing (test scoring without testing narratives)
 */
export class LLMContextBuilder {
  /**
   * Build comprehensive LLM context from FortuneReport
   */
  static buildContext(
    report: FortuneReport,
    rawData: RawBaziData,
    baseAnalysis: CompleteAnalysis,
    dailyAnalysis: PersonalizedDailyAnalysisOutput,
  ): LLMPromptContext {
    return {
      // 1. Day Master context
      dayMaster: this.getDayMasterContext(
        report.technicalBasis.dayMaster,
        baseAnalysis,
      ),

      // 2. Pillar meanings
      pillarMeanings: this.getPillarMeanings(),

      // 3. Ten God context (category-specific, with favorable & unfavorable, pattern-aware)
      tenGodContext: this.getTenGodContext(
        rawData,
        rawData.luckEra,
        rawData.natalPatterns,
      ),

      // 4. Element cycle explanations
      elementCycleExplanation: this.explainElementCycle(
        report.technicalBasis.dayMaster.element,
        rawData.favorableElements?.primary || [],
        rawData.favorableElements?.unfavorable || [],
      ),
      periodElementRelationship: this.explainElementRelationship(
        report.technicalBasis.dayMaster.element,
        report.technicalBasis.periodElement,
      ),

      // 5. Luck era context
      luckEraContext: rawData.luckEra
        ? {
            ageRange: 'Current 10-year luck period',
            lifePhase: 'Active life phase',
            element: rawData.luckEra.stemElement,
            tenGod: rawData.luckEra.tenGod,
            significance: rawData.luckEra.tenGod
              ? this.getLuckEraSignificance(rawData.luckEra.tenGod)
              : 'Neutral luck period - self-directed energy',
          }
        : null,

      // 6. Interactions with traditional meanings
      interactions: this.buildDetailedInteractions(rawData, dailyAnalysis),

      // 7. Patterns (Phase 2 - stubbed for now)
      patterns: [],

      // 8. Element balance (real calculation from natal chart)
      elementBalance: this.calculateElementBalance(baseAnalysis),

      // 9. Scores (from report)
      scores: report.scores,

      // 10. Timeframe context
      timeframe: report.timeframe,
      startDate: report.startDate,
      endDate: report.endDate,

      // 11. Chart Identity (Chapter reports only - TODO #13)
      ...(report.technicalBasis.chartIdentity && {
        chartIdentity: this.buildChartIdentityContext(
          report.technicalBasis.chartIdentity,
        ),
      }),
    };
  }

  // --- PRIVATE: DAY MASTER CONTEXT ---

  private static getDayMasterContext(
    dayMaster: FortuneReport['technicalBasis']['dayMaster'],
    baseAnalysis: CompleteAnalysis,
  ): LLMPromptContext['dayMaster'] {
    const chineseName = this.getElementChinese(dayMaster.element);
    const yinYangChinese = dayMaster.yinYang === 'Yang' ? '阳' : '阴';

    const meanings: Record<string, string> = {
      WOOD: 'Growth, flexibility, expansion, creativity, upward energy',
      FIRE: 'Passion, transformation, visibility, intensity, radiant energy',
      EARTH:
        'Stability, nurturing, centeredness, practicality, grounding energy',
      METAL:
        'Structure, precision, refinement, determination, contracting energy',
      WATER: 'Wisdom, adaptability, depth, intuition, downward energy',
    };

    return {
      element: dayMaster.element,
      yinYang: dayMaster.yinYang,
      chineseName: `${chineseName}${yinYangChinese}`,
      meaning: meanings[dayMaster.element] || dayMaster.element,
      severity: 'moderate', // TODO: Calculate from chart strength
    };
  }

  // --- PRIVATE: PILLAR MEANINGS ---

  private static getPillarMeanings(): LLMPromptContext['pillarMeanings'] {
    return {
      year: 'Ancestral roots, social identity, public image, early childhood (0-20)',
      month:
        'Career foundation, parental influence, professional sphere, young adult (20-40)',
      day: 'Self and spouse, core personality, intimate relationships, middle age (40-60)',
      hour: 'Children, legacy, innovation potential, creative output, late life (60+)',
    };
  }

  // --- PRIVATE: TEN GOD CONTEXT ---

  /**
   * Find category-specific Ten God star in natal chart (search ALL pillars)
   * Industry standard: Look for relevant stars across entire chart
   */
  private static findCategoryTenGod(
    rawData: RawBaziData,
    category: string,
  ): string | null {
    // Define category-specific Ten God keywords
    const categoryStars: Record<string, string[]> = {
      career: [
        'Officer',
        'Guan',
        '官',
        'Zheng Guan',
        '正官',
        '偏官',
        '7 Killings',
      ],
      wealth: [
        'Wealth',
        'Cai',
        '財',
        '财',
        'Zheng Cai',
        '正財',
        'Indirect Wealth',
        '偏財',
      ],
      relationships: [
        'Resource',
        'Yin',
        '印',
        'Zheng Yin',
        '正印',
        'Indirect Resource',
        '偏印',
      ],
      wellness: ['Rob Wealth', 'Jie Cai', '劫財', 'Friend', 'Bi Jian', '比肩'],
      personalGrowth: [
        'Eating God',
        'Shi Shen',
        '食神',
        'Hurting Officer',
        'Shang Guan',
        '傷官',
      ],
    };

    const targetStars = categoryStars[category] || [];

    // Search all pillars (Year, Month, Day, Hour)
    const pillars = [
      rawData.natalStructure.social, // Year
      rawData.natalStructure.career, // Month
      rawData.natalStructure.personal, // Day
      rawData.natalStructure.innovation, // Hour (may be null)
    ];

    for (const pillar of pillars) {
      if (!pillar?.tenGod) continue;

      // Check if this pillar's Ten God matches our category
      const matches = targetStars.some((star) => pillar.tenGod!.includes(star));

      if (matches) {
        return pillar.tenGod; // Return first match found
      }
    }

    return null; // No matching star found in chart
  }

  private static getTenGodContext(
    rawData: RawBaziData,
    luckEra: RawBaziData['luckEra'],
    natalPatterns: RawBaziData['natalPatterns'],
  ): LLMPromptContext['tenGodContext'] {
    const categories = [
      'career',
      'wealth',
      'relationships',
      'wellness',
      'personalGrowth',
    ] as const;

    const tenGodContext: LLMPromptContext['tenGodContext'] = {} as any;

    for (const category of categories) {
      const { favorable, unfavorable } = this.findCategoryTenGodsWithWeights(
        rawData,
        category,
        luckEra,
        natalPatterns,
      );

      const netFavorability = this.calculateNetFavorabilitySummary(
        favorable.totalWeight,
        unfavorable.totalWeight,
      );
      const summary = this.getTenGodRelationshipSummary(
        favorable.stars.map((s) => s.star),
        unfavorable.stars.map((s) => s.star),
        luckEra?.tenGod || null,
        category,
        netFavorability,
      );

      tenGodContext[category] = {
        favorableTenGods: favorable.stars,
        unfavorableTenGods: unfavorable.stars,
        netFavorability,
        summary,
      };
    }
    return tenGodContext;
  }

  /**
   * Find all favorable and unfavorable Ten Gods for a category with industry-standard pillar weighting
   * NOW PATTERN-AWARE: Chart patterns can change Ten God interpretations (e.g., Shang Guan favorable in 食傷生財)
   */
  private static findCategoryTenGodsWithWeights(
    rawData: RawBaziData,
    category: string,
    luckEra: RawBaziData['luckEra'],
    natalPatterns: RawBaziData['natalPatterns'],
  ): {
    favorable: {
      stars: Array<{
        star: string;
        natalCount: number;
        natalWeight: number;
        luckEraActive: boolean;
        timing: string;
        meaning: string;
      }>;
      totalWeight: number;
    };
    unfavorable: {
      stars: Array<{
        star: string;
        natalCount: number;
        natalWeight: number;
        luckEraActive: boolean;
        timing: string;
        meaning: string;
      }>;
      totalWeight: number;
    };
  } {
    // Industry-standard pillar weights (用神 methodology)
    const pillarWeights = {
      social: 10, // Year: Early foundations, ancestors
      career: 40, // Month: Career prime, active adult life
      personal: 30, // Day: Core self, intimate relationships
      innovation: 20, // Hour: Legacy, later life, children
    };

    // Define favorable and unfavorable Ten Gods per category (same as ViewAggregator scoring)
    const favorableMap: Record<string, string[]> = {
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

    const unfavorableMap: Record<string, string[]> = {
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

    const favorableList = favorableMap[category] || [];
    const unfavorableList = unfavorableMap[category] || [];

    // Collect Ten Gods from each pillar
    const pillars = [
      {
        name: 'social',
        data: rawData.natalStructure.social,
        weight: pillarWeights.social,
      },
      {
        name: 'career',
        data: rawData.natalStructure.career,
        weight: pillarWeights.career,
      },
      {
        name: 'personal',
        data: rawData.natalStructure.personal,
        weight: pillarWeights.personal,
      },
      {
        name: 'innovation',
        data: rawData.natalStructure.innovation,
        weight: pillarWeights.innovation,
      },
    ];

    const favorableStars = new Map<
      string,
      { count: number; weight: number; timing: string[] }
    >();
    const unfavorableStars = new Map<
      string,
      { count: number; weight: number; timing: string[] }
    >();

    for (const pillar of pillars) {
      if (!pillar.data?.tenGod) continue;

      const tenGod = pillar.data.tenGod;
      const pillarLabel = this.getPillarLabel(pillar.name);

      if (favorableList.some((fav) => tenGod.includes(fav))) {
        const existing = favorableStars.get(tenGod) || {
          count: 0,
          weight: 0,
          timing: [],
        };
        favorableStars.set(tenGod, {
          count: existing.count + 1,
          weight: existing.weight + pillar.weight,
          timing: [...existing.timing, pillarLabel],
        });
      }

      if (unfavorableList.some((unfav) => tenGod.includes(unfav))) {
        const existing = unfavorableStars.get(tenGod) || {
          count: 0,
          weight: 0,
          timing: [],
        };
        unfavorableStars.set(tenGod, {
          count: existing.count + 1,
          weight: existing.weight + pillar.weight,
          timing: [...existing.timing, pillarLabel],
        });
      }
    }

    // Check Luck Era (timing = current, weight = 50 for active influence)
    let luckEraFavorable = false;
    let luckEraUnfavorable = false;
    if (luckEra?.tenGod) {
      if (favorableList.some((fav) => luckEra.tenGod!.includes(fav))) {
        luckEraFavorable = true;
        const existing = favorableStars.get(luckEra.tenGod) || {
          count: 0,
          weight: 0,
          timing: [],
        };
        favorableStars.set(luckEra.tenGod, {
          count: existing.count,
          weight: existing.weight + 50, // Luck Era adds significant weight
          timing: [...existing.timing, 'Luck Era (Current)'],
        });
      }
      if (unfavorableList.some((unfav) => luckEra.tenGod!.includes(unfav))) {
        luckEraUnfavorable = true;
        const existing = unfavorableStars.get(luckEra.tenGod) || {
          count: 0,
          weight: 0,
          timing: [],
        };
        unfavorableStars.set(luckEra.tenGod, {
          count: existing.count,
          weight: existing.weight + 50,
          timing: [...existing.timing, 'Luck Era (Current)'],
        });
      }
    }

    // 🎯 PATTERN-AWARE INTERPRETATION: Apply pattern overrides before finalizing
    // Check if patterns change Ten God interpretations (e.g., Shang Guan favorable in 食傷生財)
    if (natalPatterns && natalPatterns.length > 0) {
      const affectedTenGods =
        PatternInterpreter.getAffectedTenGods(natalPatterns);

      for (const tenGod of affectedTenGods) {
        // Determine base interpretation
        const isBaseFavorable = favorableList.some((fav) =>
          tenGod.includes(fav),
        );
        const isBaseUnfavorable = unfavorableList.some((unfav) =>
          tenGod.includes(unfav),
        );
        const baseInterpretation = isBaseFavorable
          ? 'favorable'
          : isBaseUnfavorable
            ? 'unfavorable'
            : 'neutral';

        // Get pattern-influenced interpretation
        const finalInterp = PatternInterpreter.getFinalInterpretation(
          tenGod,
          category as any,
          baseInterpretation as any,
          natalPatterns,
        );

        // If interpretation changed, move Ten God between lists
        if (
          finalInterp.patternInfluenced &&
          finalInterp.interpretation !== baseInterpretation
        ) {
          const favorableData = favorableStars.get(tenGod);
          const unfavorableData = unfavorableStars.get(tenGod);

          // Case 1: unfavorable → favorable/enhanced (positive pattern effect)
          if (
            unfavorableData &&
            (finalInterp.interpretation === 'favorable' ||
              finalInterp.interpretation === 'enhanced')
          ) {
            favorableStars.set(tenGod, unfavorableData);
            unfavorableStars.delete(tenGod);
          }

          // Case 2: favorable → unfavorable/very-unfavorable (negative pattern effect)
          if (
            favorableData &&
            (finalInterp.interpretation === 'unfavorable' ||
              finalInterp.interpretation === 'very-unfavorable')
          ) {
            unfavorableStars.set(tenGod, favorableData);
            favorableStars.delete(tenGod);
          }

          // Case 3: favorable → enhanced (stays favorable, just stronger)
          // No movement needed, already in favorable list

          // Case 4: unfavorable/favorable → neutral (pattern mitigates)
          if (finalInterp.interpretation === 'neutral') {
            // Remove from both lists (becomes neutral)
            favorableStars.delete(tenGod);
            unfavorableStars.delete(tenGod);
          }
        }
      }
    }

    // Convert to arrays
    const favorable = {
      stars: Array.from(favorableStars.entries()).map(([star, data]) => ({
        star,
        natalCount: data.count,
        natalWeight: data.weight,
        luckEraActive: luckEra?.tenGod === star && luckEraFavorable,
        timing: data.timing.join(', '),
        meaning: this.getTenGodMeaningWithPattern(
          star,
          category,
          natalPatterns,
        ), // Updated to include pattern context
      })),
      totalWeight: Array.from(favorableStars.values()).reduce(
        (sum, data) => sum + data.weight,
        0,
      ),
    };

    const unfavorable = {
      stars: Array.from(unfavorableStars.entries()).map(([star, data]) => ({
        star,
        natalCount: data.count,
        natalWeight: data.weight,
        luckEraActive: luckEra?.tenGod === star && luckEraUnfavorable,
        timing: data.timing.join(', '),
        meaning: this.getTenGodMeaningWithPattern(
          star,
          category,
          natalPatterns,
        ), // Updated to include pattern context
      })),
      totalWeight: Array.from(unfavorableStars.values()).reduce(
        (sum, data) => sum + data.weight,
        0,
      ),
    };

    return { favorable, unfavorable };
  }

  /**
   * Get human-readable pillar label
   */
  private static getPillarLabel(pillarName: string): string {
    const labels: Record<string, string> = {
      social: 'Year Pillar (Foundations)',
      career: 'Month Pillar (Career Prime)',
      personal: 'Day Pillar (Core Self)',
      innovation: 'Hour Pillar (Legacy)',
    };
    return labels[pillarName] || pillarName;
  }

  /**
   * Calculate net favorability summary
   */
  private static calculateNetFavorabilitySummary(
    favorableWeight: number,
    unfavorableWeight: number,
  ): string {
    const total = favorableWeight + unfavorableWeight;
    if (total === 0) return 'neutral';

    const favorableRatio = favorableWeight / total;

    if (favorableRatio >= 0.7) return 'favorable-dominant';
    if (favorableRatio >= 0.55) return 'favorable-mixed';
    if (favorableRatio >= 0.45) return 'balanced';
    if (favorableRatio >= 0.3) return 'unfavorable-mixed';
    return 'unfavorable-dominant';
  }

  /**
   * Generate relationship summary for LLM context
   */
  private static getTenGodRelationshipSummary(
    favorableStars: string[],
    unfavorableStars: string[],
    luckEraTenGod: string | null,
    category: string,
    netFavorability: string,
  ): string {
    if (favorableStars.length === 0 && unfavorableStars.length === 0) {
      return `No ${category} Ten Gods present in natal chart - self-directed ${category} path.`;
    }

    const parts: string[] = [];

    if (favorableStars.length > 0) {
      parts.push(
        `Favorable: ${favorableStars.join(', ')} (supporting ${category})`,
      );
    }

    if (unfavorableStars.length > 0) {
      parts.push(
        `Challenging: ${unfavorableStars.join(', ')} (creating tension in ${category})`,
      );
    }

    if (luckEraTenGod) {
      parts.push(`Current Luck Era activates ${luckEraTenGod}`);
    }

    parts.push(`Overall: ${netFavorability}`);

    return parts.join('. ');
  }

  /**
   * Get traditional Ten God meaning for specific category
   */
  private static getTenGodMeaning(tenGod: string, category: string): string {
    const meanings: Record<string, Record<string, string>> = {
      'Direct Officer': {
        career:
          'Formal authority, structured career path, management roles, official recognition, disciplined advancement',
        wealth:
          'Stable salary-based income, institutional support, predictable earnings, formal compensation',
        relationships:
          'Authority figures, formal partnerships, structured connections, respect-based bonds',
        wellness:
          'Disciplined health practices, preventive care, structured wellness, stress from responsibility',
        personalGrowth:
          'Formal education, recognized credentials, traditional learning, structured development',
      },
      'Indirect Officer': {
        career:
          'Strategic roles, behind-scenes influence, advisory positions, unconventional authority',
        wealth:
          'Alternative income streams, consulting fees, strategic financial planning, advisory compensation',
        relationships:
          'Mentor figures, strategic alliances, influential connections, wisdom-based bonds',
        wellness:
          'Alternative wellness approaches, strategic health management, stress from hidden pressures',
        personalGrowth:
          'Strategic learning, wisdom cultivation, subtle mastery, unconventional education',
      },
      'Direct Wealth': {
        career:
          'Stable employment, reliable income sources, asset management, tangible value creation',
        wealth:
          'Primary income, savings accumulation, tangible assets, financial stability, material security',
        relationships:
          'Committed partnerships, reliable connections, material support, stable bonds',
        wellness:
          'Physical resources for health, stable wellness routine, material health support',
        personalGrowth:
          'Practical skill development, tangible achievement, measurable progress',
      },
      'Indirect Wealth': {
        career:
          'Multiple income streams, entrepreneurial ventures, opportunistic projects, flexible work',
        wealth:
          'Windfall gains, investment returns, speculative income, varied financial sources',
        relationships:
          'Multiple connections, networking opportunities, social wealth, flexible bonds',
        wellness:
          'Varied wellness approaches, opportunistic health gains, flexible health practices',
        personalGrowth:
          'Diverse learning, seizing opportunities, flexible growth, multi-faceted development',
      },
      'Eating God': {
        career:
          'Creative work, talent expression, service-based income, enjoyment in work, artistic pursuits',
        wealth:
          'Income from creativity, monetizing talents, steady artistic income, passion-based earnings',
        relationships:
          'Warm connections, nurturing relationships, enjoying company, creative bonds',
        wellness:
          'Natural health, good appetite, vitality through enjoyment, pleasure-based wellness',
        personalGrowth:
          'Creative learning, skill refinement, joyful mastery, artistic development',
      },
      'Hurting Officer': {
        career:
          'Innovation, creative rebellion, breaking conventions, technical mastery, disruptive work',
        wealth:
          'Income through innovation, intellectual property, disruptive ventures, unconventional earnings',
        relationships:
          'Intense connections, transformative relationships, eloquent expression, passionate bonds',
        wellness:
          'Push-pull with health, stress from intensity, breakthrough healing, transformative wellness',
        personalGrowth:
          'Radical learning, challenging conventions, intellectual mastery, revolutionary growth',
      },
      Friend: {
        career:
          'Partnership ventures, collaboration, peer networks, team projects, equal cooperation',
        wealth:
          'Shared resources, partnership income, collaborative wealth, equal financial sharing',
        relationships:
          'Equal partnerships, peer relationships, mutual support, balanced bonds',
        wellness:
          'Group wellness, mutual health support, balanced energy, shared health practices',
        personalGrowth:
          'Peer learning, collaborative growth, shared knowledge, mutual development',
      },
      'Rob Wealth': {
        career:
          'Competitive environments, resource battles, ambitious pursuits, aggressive advancement',
        wealth:
          'Competition for resources, aggressive wealth pursuit, financial friction, competitive earnings',
        relationships:
          'Competitive dynamics, resource sharing conflicts, rivalry, challenging bonds',
        wellness:
          'Energy battles, competitive stress, fighting for vitality, aggressive health pursuit',
        personalGrowth:
          'Competitive learning, pushing limits, ambitious growth, challenging development',
      },
      'Direct Resource': {
        career:
          'Education-based work, credentials, knowledge work, teaching roles, academic pursuits',
        wealth:
          'Income through knowledge, education-based earnings, intellectual capital, teaching income',
        relationships:
          'Mentor-student dynamics, learning relationships, guidance, wisdom-based bonds',
        wellness:
          'Mental health focus, intellectual wellness, knowledge of health, mind-body connection',
        personalGrowth:
          'Formal education, traditional learning, wisdom accumulation, structured knowledge',
      },
      'Indirect Resource': {
        career:
          'Creative protection, artistic patronage, unconventional knowledge work, alternative education',
        wealth:
          'Alternative knowledge income, creative intellectual capital, unconventional teaching earnings',
        relationships:
          'Creative mentorship, artistic connections, nurturing guidance, unconventional wisdom bonds',
        wellness:
          'Alternative health knowledge, creative wellness approaches, holistic health understanding',
        personalGrowth:
          'Creative education, artistic learning, unconventional wisdom, alternative development',
      },
    };

    return (
      meanings[tenGod]?.[category] ||
      `${tenGod} influence in ${category} context`
    );
  }

  /**
   * Get Ten God meaning with pattern context (PATTERN-AWARE!)
   * If patterns change the interpretation, adds context about the pattern effect
   */
  private static getTenGodMeaningWithPattern(
    tenGod: string,
    category: string,
    natalPatterns: RawBaziData['natalPatterns'],
  ): string {
    const baseMeaning = this.getTenGodMeaning(tenGod, category);

    // If no patterns, return base meaning
    if (!natalPatterns || natalPatterns.length === 0) {
      return baseMeaning;
    }

    // Check if patterns affect this Ten God
    const interpretationChange = PatternInterpreter.getInterpretationChange(
      tenGod,
      category as any,
      natalPatterns,
    );

    if (!interpretationChange) {
      return baseMeaning;
    }

    // Add pattern context to meaning
    const patternContext = interpretationChange.reason;
    return `${baseMeaning}. ✨ Pattern Effect: ${patternContext}`;
  }

  /**
   * Explain relationship between natal and luck Ten Gods
   */
  private static getTenGodRelationship(
    natal: string | null,
    luck: string | null,
    category: string,
  ): string {
    if (!natal && !luck) {
      return 'Pure self-reliance - no external Ten God influence, self-directed energy';
    }
    if (!natal) {
      return `Current luck brings ${luck} energy into play - external influence activating ${category}`;
    }
    if (!luck) {
      return `Natal ${natal} operates without current luck modification - foundational energy dominant`;
    }

    // Both present - describe interaction
    if (natal === luck) {
      return `Natal ${natal} reinforced by luck ${luck} - doubled energy, intensified influence`;
    }

    // Different Ten Gods - complementary or conflicting
    const complementary = [
      ['Direct Officer', 'Direct Resource'],
      ['Indirect Officer', 'Indirect Resource'],
      ['Direct Wealth', 'Eating God'],
      ['Indirect Wealth', 'Hurting Officer'],
      ['Friend', 'Rob Wealth'],
    ];

    const isComplementary = complementary.some(
      ([a, b]) => (natal === a && luck === b) || (natal === b && luck === a),
    );

    if (isComplementary) {
      return `Natal ${natal} complemented by luck ${luck} - harmonious interaction, mutual support`;
    }

    return `Natal ${natal} interacts with luck ${luck} - dynamic tension, transformative potential`;
  }

  // --- PRIVATE: ELEMENT CYCLE EXPLANATIONS ---

  /**
   * Explain 5-element cycle (production and control)
   */
  private static explainElementCycle(
    dayMaster: ElementType,
    favorable: ElementType[],
    unfavorable: ElementType[],
  ): string {
    const explanations: string[] = [];

    // Production cycle (生): Wood→Fire→Earth→Metal→Water→Wood
    const production: Record<ElementType, ElementType> = {
      WOOD: 'FIRE',
      FIRE: 'EARTH',
      EARTH: 'METAL',
      METAL: 'WATER',
      WATER: 'WOOD',
    };

    // Control cycle (克): Wood→Earth, Fire→Metal, Earth→Water, Metal→Wood, Water→Fire
    const control: Record<ElementType, ElementType> = {
      WOOD: 'EARTH',
      FIRE: 'METAL',
      EARTH: 'WATER',
      METAL: 'WOOD',
      WATER: 'FIRE',
    };

    // Reverse lookup for "what produces me"
    const producedBy: Record<ElementType, ElementType> = {
      FIRE: 'WOOD',
      EARTH: 'FIRE',
      METAL: 'EARTH',
      WATER: 'METAL',
      WOOD: 'WATER',
    };

    // Reverse lookup for "what controls me"
    const controlledBy: Record<ElementType, ElementType> = {
      EARTH: 'WOOD',
      METAL: 'FIRE',
      WATER: 'EARTH',
      WOOD: 'METAL',
      FIRE: 'WATER',
    };

    for (const fav of favorable) {
      if (producedBy[dayMaster] === fav) {
        explanations.push(
          `${fav} produces ${dayMaster} (生 shēng) - nourishing support, strengthening energy`,
        );
      } else if (production[dayMaster] === fav) {
        explanations.push(
          `${dayMaster} produces ${fav} (生 shēng) - outward expression, creative outlet`,
        );
      }
    }

    for (const unfav of unfavorable) {
      if (controlledBy[dayMaster] === unfav) {
        explanations.push(
          `${unfav} controls ${dayMaster} (克 kè) - restrictive pressure, challenging force`,
        );
      } else if (control[dayMaster] === unfav) {
        explanations.push(
          `${dayMaster} controls ${unfav} (克 kè) - dominating energy, assertive force`,
        );
      }
    }

    return explanations.length > 0
      ? explanations.join('; ')
      : 'Neutral element balance - no strong production or control cycles active';
  }

  /**
   * Explain relationship between Day Master and period element
   */
  private static explainElementRelationship(
    from: ElementType,
    to: ElementType,
  ): string {
    const production: Record<ElementType, ElementType> = {
      WOOD: 'FIRE',
      FIRE: 'EARTH',
      EARTH: 'METAL',
      METAL: 'WATER',
      WATER: 'WOOD',
    };

    const control: Record<ElementType, ElementType> = {
      WOOD: 'EARTH',
      FIRE: 'METAL',
      EARTH: 'WATER',
      METAL: 'WOOD',
      WATER: 'FIRE',
    };

    if (production[from] === to) {
      return `${from} produces ${to} (生) - Day Master generates period energy, outward expression, energy expenditure, creative output`;
    }
    if (production[to] === from) {
      return `${to} produces ${from} (生) - Period nourishes Day Master, supportive environment, strengthening influence, beneficial timing`;
    }
    if (control[from] === to) {
      return `${from} controls ${to} (克) - Day Master dominates period, assertive action, controlling influence, active mastery`;
    }
    if (control[to] === from) {
      return `${to} controls ${from} (克) - Period challenges Day Master, external pressure, resistance, testing circumstances`;
    }
    if (from === to) {
      return `${from} meets ${to} (同) - Same element, peer energy, can be supportive (cooperation) or competitive (resource sharing)`;
    }

    // Indirect relationship (neither production nor control)
    return `${from} and ${to} (間接) - Indirect relationship, neutral interaction, minimal direct influence`;
  }

  // --- PRIVATE: LUCK ERA SIGNIFICANCE ---

  /**
   * Get traditional significance of luck era Ten God
   */
  private static getLuckEraSignificance(tenGod: string): string {
    const significance: Record<string, string> = {
      'Direct Officer':
        'Authority and structure era - career advancement, formal recognition, disciplined growth, institutional success',
      'Indirect Officer':
        'Strategy and influence era - behind-scenes power, advisory roles, wisdom cultivation, subtle authority',
      'Direct Wealth':
        'Stability and accumulation era - wealth building, asset growth, material security, tangible achievements',
      'Indirect Wealth':
        'Opportunity and flexibility era - dynamic wealth, speculative gains, multiple income streams, financial agility',
      'Eating God':
        'Creativity and expression era - talent flourishing, artistic pursuits, enjoyment in work, service-based success',
      'Hurting Officer':
        'Innovation and transformation era - breakthrough thinking, creative rebellion, technical mastery, disruptive change',
      Friend:
        'Collaboration and networking era - partnership power, peer support, team success, mutual growth',
      'Rob Wealth':
        'Competition and ambition era - aggressive pursuit, resource battles, ambitious advancement, competitive edge',
      'Direct Resource':
        'Education and wisdom era - learning phase, knowledge accumulation, traditional study, credential building',
      'Indirect Resource':
        'Creative protection era - artistic development, unconventional wisdom, alternative learning, nurturing growth',
    };
    return significance[tenGod] || `${tenGod} era - specific influence period`;
  }

  // --- PRIVATE: INTERACTION NARRATIVES ---

  /**
   * Build detailed interaction explanations with traditional meanings
   */
  private static buildDetailedInteractions(
    rawData: RawBaziData,
    dailyAnalysis: PersonalizedDailyAnalysisOutput,
  ): LLMPromptContext['interactions'] {
    const interactions: LLMPromptContext['interactions'] = [];

    // Map interaction types to traditional Chinese terms and meanings
    const interactionMeanings: Record<
      string,
      { chinese: string; meaning: string }
    > = {
      StemCombination: {
        chinese: '天干合 (Tiāngān Hé)',
        meaning:
          'Heavenly Stem Combination - harmonious merging, cooperative energy, transformation through unity',
      },
      StemClash: {
        chinese: '天干沖 (Tiāngān Chōng)',
        meaning:
          'Heavenly Stem Clash - direct conflict, breakthrough through friction, dynamic tension',
      },
      Branch6Combo: {
        chinese: '六合 (Liù Hé)',
        meaning:
          'Six Harmonies - supportive union, complementary partnership, mutual benefit',
      },
      TrinityCombo: {
        chinese: '三合 (Sān Hé)',
        meaning:
          'Trinity Combination - powerful alliance, elemental transformation, unified strength',
      },
      DirectionalCombo: {
        chinese: '方合 (Fāng Hé)',
        meaning:
          'Directional Combination - seasonal alignment, directional power, environmental support',
      },
      BranchClash: {
        chinese: '地支沖 (Dìzhī Chōng)',
        meaning:
          'Earthly Branch Clash - fundamental conflict, movement and change, disruptive force',
      },
      BranchHarm: {
        chinese: '地支害 (Dìzhī Hài)',
        meaning:
          'Earthly Branch Harm - subtle friction, hidden obstacles, indirect challenge',
      },
      BranchPunishment: {
        chinese: '地支刑 (Dìzhī Xíng)',
        meaning:
          'Earthly Branch Punishment - karmic pressure, self-sabotage, internal conflict',
      },
      BranchDestruction: {
        chinese: '地支破 (Dìzhī Pò)',
        meaning:
          'Earthly Branch Destruction - breaking apart, dissolution, structural damage',
      },
    };

    // Process each life area's triggers
    for (const [areaKey, lifeArea] of Object.entries(rawData.lifeAreas)) {
      for (const trigger of lifeArea.triggers) {
        const interactionInfo = interactionMeanings[trigger.type] || {
          chinese: trigger.type,
          meaning: 'Interaction type',
        };

        // Determine affected categories based on life area
        const affectedCategories: Array<
          'career' | 'wealth' | 'relationships' | 'wellness' | 'personalGrowth'
        > = [];
        if (areaKey === 'social') affectedCategories.push('relationships');
        if (areaKey === 'career') affectedCategories.push('career', 'wealth');
        if (areaKey === 'personal')
          affectedCategories.push('wellness', 'relationships');
        if (areaKey === 'innovation')
          affectedCategories.push('personalGrowth', 'career');

        // Determine favorability
        let favorability: 'favorable' | 'unfavorable' | 'neutral' | 'mixed' =
          'neutral';
        if (trigger.involvesFavorable && trigger.involvesUnfavorable) {
          favorability = 'mixed';
        } else if (trigger.involvesFavorable) {
          favorability = 'favorable';
        } else if (trigger.involvesUnfavorable) {
          favorability = 'unfavorable';
        }

        // Determine significance (clashes and punishments are high, combinations are moderate)
        const highSignificance = [
          'StemClash',
          'BranchClash',
          'BranchPunishment',
          'BranchDestruction',
        ];
        const significance = highSignificance.includes(trigger.type)
          ? 'high'
          : 'moderate';

        interactions.push({
          type: trigger.type,
          chineseTerm: interactionInfo.chinese,
          description: trigger.description,
          participants: `${trigger.source} interaction`,
          traditionalMeaning: interactionInfo.meaning,
          affectedCategories,
          favorability,
          significance,
          interpretation: `${areaKey} area: ${interactionInfo.meaning} - ${favorability} influence`,
        });
      }
    }

    return interactions;
  }

  // --- PRIVATE: HELPERS ---

  private static getElementChinese(element: ElementType): string {
    const map: Record<ElementType, string> = {
      WOOD: '木',
      FIRE: '火',
      EARTH: '土',
      METAL: '金',
      WATER: '水',
    };
    return map[element];
  }

  // --- PRIVATE: ELEMENT BALANCE CALCULATION ---

  private static calculateElementBalance(
    baseAnalysis: CompleteAnalysis,
  ): LLMPromptContext['elementBalance'] {
    const elementCounts: Record<ElementType, number> = {
      WOOD: 0,
      FIRE: 0,
      EARTH: 0,
      METAL: 0,
      WATER: 0,
    };

    // Count elements from all 8 positions (4 pillars × 2: stem + branch)
    const pillars = baseAnalysis.detailedPillars;

    if (pillars) {
      // Year pillar
      if (pillars.year.heavenlyStem?.elementType) {
        elementCounts[pillars.year.heavenlyStem.elementType]++;
      }
      if (pillars.year.earthlyBranch?.elementType) {
        elementCounts[pillars.year.earthlyBranch.elementType]++;
      }

      // Month pillar
      if (pillars.month.heavenlyStem?.elementType) {
        elementCounts[pillars.month.heavenlyStem.elementType]++;
      }
      if (pillars.month.earthlyBranch?.elementType) {
        elementCounts[pillars.month.earthlyBranch.elementType]++;
      }

      // Day pillar
      if (pillars.day.heavenlyStem?.elementType) {
        elementCounts[pillars.day.heavenlyStem.elementType]++;
      }
      if (pillars.day.earthlyBranch?.elementType) {
        elementCounts[pillars.day.earthlyBranch.elementType]++;
      }

      // Hour pillar (if present)
      if (pillars.hour) {
        if (pillars.hour.heavenlyStem?.elementType) {
          elementCounts[pillars.hour.heavenlyStem.elementType]++;
        }
        if (pillars.hour.earthlyBranch?.elementType) {
          elementCounts[pillars.hour.earthlyBranch.elementType]++;
        }
      }
    }

    // Find dominant and weakest elements
    let dominantElement: ElementType = 'WOOD';
    let weakestElement: ElementType = 'FIRE';
    let maxCount = -1;
    let minCount = Infinity;

    for (const [element, count] of Object.entries(elementCounts)) {
      if (count > maxCount) {
        maxCount = count;
        dominantElement = element as ElementType;
      }
      if (count < minCount) {
        minCount = count;
        weakestElement = element as ElementType;
      }
    }

    // Generate interpretation
    const interpretation = this.interpretElementBalance(
      elementCounts,
      dominantElement,
      weakestElement,
    );

    return {
      WOOD: elementCounts.WOOD,
      FIRE: elementCounts.FIRE,
      EARTH: elementCounts.EARTH,
      METAL: elementCounts.METAL,
      WATER: elementCounts.WATER,
      dominantElement,
      weakestElement,
      interpretation,
    };
  }

  private static interpretElementBalance(
    counts: Record<ElementType, number>,
    dominant: ElementType,
    weakest: ElementType,
  ): string {
    const parts: string[] = [];

    // Dominant element interpretation
    if (counts[dominant] >= 3) {
      const meanings: Record<ElementType, string> = {
        WOOD: 'Strong growth energy, creativity, but may lack stability',
        FIRE: 'High passion and drive, but may burn out quickly',
        EARTH: 'Solid foundation and stability, but may resist change',
        METAL: 'Strong structure and determination, but may be rigid',
        WATER: 'Deep wisdom and adaptability, but may lack direction',
      };
      parts.push(`Heavy ${dominant}: ${meanings[dominant]}`);
    }

    // Weakest element interpretation
    if (counts[weakest] === 0) {
      const missing: Record<ElementType, string> = {
        WOOD: 'Lacking growth initiative and flexibility',
        FIRE: 'Lacking passion and visibility',
        EARTH: 'Lacking grounding and practical stability',
        METAL: 'Lacking structure and decisive action',
        WATER: 'Lacking depth and introspective wisdom',
      };
      parts.push(`Missing ${weakest}: ${missing[weakest]}`);
    }

    return parts.join('. ') || 'Balanced element distribution';
  }

  /**
   * Build Chart Identity context for LLM (Chapter reports only)
   * TODO #13: Add Western-friendly energy type to ChartIdentity
   */
  private static buildChartIdentityContext(
    chartIdentity: ChartIdentity,
  ): NonNullable<LLMPromptContext['chartIdentity']> {
    // Western-friendly energy type (e.g., "Fire+" for Yang Fire, "Water-" for Yin Water)
    const element = chartIdentity.dayMaster.element;
    const energyType = `${element.charAt(0)}${element.slice(1).toLowerCase()}${chartIdentity.dayMaster.yinYang === 'Yang' ? '+' : '-'}`;

    return {
      ...chartIdentity,
      energyType,
    };
  }
}
