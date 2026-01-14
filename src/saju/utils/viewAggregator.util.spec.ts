import {
  BaziCalculator,
  PersonalizedDailyAnalysisOutput,
} from '@aharris02/bazi-calculator-by-alvamind';
import { ViewAggregator } from './viewAggregator.util';
import { BaziDataExtractor } from './baziExtractor.util';
import { FortuneReport } from '../types';

/**
 * ViewAggregator Tests
 *
 * Strategy: Incremental black-box testing with real BaziCalculator data
 * Reference: view.aggregator.TEST_PLAN.md
 */
describe('ViewAggregator', () => {
  // Consistent test data
  const birthDate = new Date('1990-01-15T08:00:00-05:00'); // 8 AM EST
  const timezone = 'America/New_York';
  const gender = 'male';
  const targetDate = new Date('2026-01-09T12:00:00-05:00'); // Noon EST

  // Helper to access private methods for testing
  const getPrivateMethod = (methodName: string) => {
    return (ViewAggregator as any)[methodName];
  };

  describe('Test 1: Daily Report - Basic Structure', () => {
    it('should return FortuneReport with all required fields', () => {
      // Arrange
      const calculator = new BaziCalculator(birthDate, gender, timezone, true);
      const baseAnalysis = calculator.getCompleteAnalysis();
      const dailyAnalysis = calculator.getAnalysisForDate(
        targetDate,
        timezone,
        {
          type: 'personalized',
        },
      ) as PersonalizedDailyAnalysisOutput;

      expect(baseAnalysis).not.toBeNull();
      expect(dailyAnalysis).not.toBeNull();

      const userContext = BaziDataExtractor.buildUserContext(baseAnalysis!);
      const rawData = BaziDataExtractor.extract(userContext, dailyAnalysis!);

      // Act
      const report = ViewAggregator.forDaily(
        rawData,
        baseAnalysis!,
        dailyAnalysis!,
        userContext.natalPatterns,
      );

      // Assert: Timeframe
      expect(report.timeframe).toBe('daily');
      expect(report.startDate).toEqual(rawData.date);
      expect(report.endDate).toEqual(rawData.date);
      // Note: label field removed - LLM generates titles

      // Assert: Scores exist
      expect(report.scores).toBeDefined();
      expect(report.scores.overall).toBeDefined();
      expect(report.scores.career).toBeDefined();
      expect(report.scores.wealth).toBeDefined();
      expect(report.scores.relationships).toBeDefined();
      expect(report.scores.wellness).toBeDefined();
      expect(report.scores.personalGrowth).toBeDefined();

      // Assert: Lucky symbols
      expect(report.luckySymbols).toBeDefined();
      expect(Array.isArray(report.luckySymbols.numbers)).toBe(true);
      expect(Array.isArray(report.luckySymbols.colors)).toBe(true);
      expect(Array.isArray(report.luckySymbols.directions)).toBe(true);

      // Assert: Special stars (array, may be empty for MVP)
      expect(Array.isArray(report.specialStars)).toBe(true);

      // Assert: Hourly breakdown
      expect(report.hourlyBreakdown).toBeDefined();
      expect(Array.isArray(report.hourlyBreakdown)).toBe(true);

      // Assert: Technical basis (simplified - raw facts only)
      expect(report.technicalBasis).toBeDefined();
      expect(report.technicalBasis.dayMaster).toBeDefined();
      expect(report.technicalBasis.dayMaster.element).toBeDefined();
      expect(report.technicalBasis.natalStructure).toBeDefined();
      expect(report.technicalBasis.luckEra).toBeDefined();
      expect(report.technicalBasis.favorableElements).toBeDefined();
      expect(report.technicalBasis.periodElement).toBeDefined();
      expect(report.technicalBasis.rawTriggers).toBeDefined();

      // LLMContextBuilder handles comprehensive narratives separately
      // (not tested here - testing scoring/aggregation only)

      // Assert: Metadata
      expect(report.metadata).toBeDefined();
      expect(report.metadata.dataSource).toBe('bazi-calculator-by-alvamind');
      expect(report.metadata.calculatedAt).toBeInstanceOf(Date);
    });

    it('should have all scores in 0-100 range', () => {
      // Arrange
      const calculator = new BaziCalculator(birthDate, gender, timezone, true);
      const baseAnalysis = calculator.getCompleteAnalysis();
      const dailyAnalysis = calculator.getAnalysisForDate(
        targetDate,
        timezone,
        {
          type: 'personalized',
        },
      ) as PersonalizedDailyAnalysisOutput;
      const userContext = BaziDataExtractor.buildUserContext(baseAnalysis!);
      const rawData = BaziDataExtractor.extract(userContext, dailyAnalysis!);

      // Act
      const report = ViewAggregator.forDaily(
        rawData,
        baseAnalysis!,
        dailyAnalysis!,
        userContext.natalPatterns,
      );

      // Assert: All scores are clamped (check net score)
      expect(report.scores.overall.net).toBeGreaterThanOrEqual(0);
      expect(report.scores.overall.net).toBeLessThanOrEqual(100);
      expect(report.scores.career.net).toBeGreaterThanOrEqual(0);
      expect(report.scores.career.net).toBeLessThanOrEqual(100);
      expect(report.scores.wealth.net).toBeGreaterThanOrEqual(0);
      expect(report.scores.wealth.net).toBeLessThanOrEqual(100);
      // Also check opportunities and challenges are in range
      expect(report.scores.overall.opportunities).toBeGreaterThanOrEqual(0);
      expect(report.scores.overall.opportunities).toBeLessThanOrEqual(100);
      expect(report.scores.overall.challenges).toBeGreaterThanOrEqual(0);
      expect(report.scores.overall.challenges).toBeLessThanOrEqual(100);
      expect(report.scores.relationships.net).toBeGreaterThanOrEqual(0);
      expect(report.scores.relationships.net).toBeLessThanOrEqual(100);
      expect(report.scores.wellness.net).toBeGreaterThanOrEqual(0);
      expect(report.scores.wellness.net).toBeLessThanOrEqual(100);
      expect(report.scores.personalGrowth.net).toBeGreaterThanOrEqual(0);
      expect(report.scores.personalGrowth.net).toBeLessThanOrEqual(100);
    });

    it('should have hourly breakdown with 12 two-hour windows', () => {
      // Arrange
      const calculator = new BaziCalculator(birthDate, gender, timezone, true);
      const baseAnalysis = calculator.getCompleteAnalysis();
      const dailyAnalysis = calculator.getAnalysisForDate(
        targetDate,
        timezone,
        {
          type: 'personalized',
        },
      ) as PersonalizedDailyAnalysisOutput;
      const userContext = BaziDataExtractor.buildUserContext(baseAnalysis!);
      const rawData = BaziDataExtractor.extract(userContext, dailyAnalysis!);

      // Act
      const report = ViewAggregator.forDaily(
        rawData,
        baseAnalysis!,
        dailyAnalysis!,
        userContext.natalPatterns,
      );

      // Assert: 12 windows
      expect(report.hourlyBreakdown).toHaveLength(12);

      // Assert: Each window structure
      for (const hourBlock of report.hourlyBreakdown!) {
        expect(hourBlock.startTime).toBeInstanceOf(Date);
        expect(hourBlock.endTime).toBeInstanceOf(Date);
        // Note: label field removed - frontend formats times

        // Each hour block has scores (check net)
        expect(hourBlock.scores).toBeDefined();
        expect(hourBlock.scores.overall.net).toBeGreaterThanOrEqual(0);
        expect(hourBlock.scores.overall.net).toBeLessThanOrEqual(100);
      }

      // Assert: Each block is 2 hours
      const firstBlock = report.hourlyBreakdown![0];
      const timeDiff =
        firstBlock.endTime.getTime() - firstBlock.startTime.getTime();
      const hoursDiff = timeDiff / (1000 * 60 * 60);
      expect(hoursDiff).toBe(2);
    });
  });

  // ============================================================================
  // FREQUENCY-BASED AGGREGATION TESTS
  // Testing private helper methods to validate aggregation strategy
  // ============================================================================

  describe('Frequency-Based Aggregation Helpers', () => {
    // Helper to create mock reports for testing
    const createMockReport = (
      date: Date,
      scores: { net: number },
      triggers: Array<{
        type: string;
        involvesFavorable?: boolean;
        involvesUnfavorable?: boolean;
      }> = [],
      luckyNumbers: number[] = [],
      specialStars: string[] = [],
    ): Partial<FortuneReport> => ({
      startDate: date,
      endDate: date,
      scores: {
        overall: { opportunities: 50, challenges: 50, net: scores.net },
        career: { opportunities: 50, challenges: 50, net: 50 },
        wealth: { opportunities: 50, challenges: 50, net: 50 },
        relationships: { opportunities: 50, challenges: 50, net: 50 },
        wellness: { opportunities: 50, challenges: 50, net: 50 },
        personalGrowth: { opportunities: 50, challenges: 50, net: 50 },
      },
      technicalBasis: {
        rawTriggers: {
          social: {
            active: triggers.length > 0,
            triggers: triggers.map((t) => ({
              ...t,
              type: t.type,
              description: '',
              affectedTenGods: [],
              involvesFavorable: t.involvesFavorable || false,
              involvesUnfavorable: t.involvesUnfavorable || false,
            })),
          },
          career: { active: false, triggers: [] },
          personal: { active: false, triggers: [] },
          innovation: { active: false, triggers: [] },
        },
      } as any,
      luckySymbols: {
        numbers: luckyNumbers,
        colors: [],
        directions: [],
      },
      specialStars: specialStars.map((name) => ({
        name,
        chineseName: name,
        description: '',
        affectedCategories: [],
      })),
    });

    describe('daysBetween()', () => {
      it('should calculate days between two dates correctly', () => {
        const daysBetween = getPrivateMethod('daysBetween');

        const start = new Date('2020-01-01');
        const end = new Date('2020-01-10');

        expect(daysBetween.call(ViewAggregator, start, end)).toBe(10);
      });

      it('should handle same-day dates', () => {
        const daysBetween = getPrivateMethod('daysBetween');

        const date = new Date('2020-01-01');

        expect(daysBetween.call(ViewAggregator, date, date)).toBe(1);
      });

      it('should handle year boundaries', () => {
        const daysBetween = getPrivateMethod('daysBetween');

        const start = new Date('2019-12-31');
        const end = new Date('2020-01-02');

        expect(daysBetween.call(ViewAggregator, start, end)).toBe(3);
      });
    });

    describe('analyzeScoreVolatility()', () => {
      it('should detect stable scores (low volatility)', () => {
        const analyzeScoreVolatility = getPrivateMethod(
          'analyzeScoreVolatility',
        );

        const reports = Array.from({ length: 10 }, (_, i) =>
          createMockReport(new Date(2020, 0, i + 1), {
            net: 55 + ((i % 3) - 1),
          }),
        ) as FortuneReport[];

        const result = analyzeScoreVolatility.call(ViewAggregator, reports);

        expect(result.trend).toBe('stable');
        expect(result.standardDeviation).toBeLessThan(5);
        expect(result.min).toBeGreaterThanOrEqual(54);
        expect(result.max).toBeLessThanOrEqual(56);
      });

      it('should detect volatile scores (high volatility)', () => {
        const analyzeScoreVolatility = getPrivateMethod(
          'analyzeScoreVolatility',
        );

        const reports = Array.from({ length: 10 }, (_, i) =>
          createMockReport(new Date(2020, 0, i + 1), {
            net: i % 2 === 0 ? 80 : 20,
          }),
        ) as FortuneReport[];

        const result = analyzeScoreVolatility.call(ViewAggregator, reports);

        expect(result.trend).toBe('volatile');
        expect(result.standardDeviation).toBeGreaterThan(20);
        expect(result.min).toBe(20);
        expect(result.max).toBe(80);
      });

      it('should detect increasing trend', () => {
        const analyzeScoreVolatility = getPrivateMethod(
          'analyzeScoreVolatility',
        );

        const reports = Array.from({ length: 20 }, (_, i) =>
          createMockReport(new Date(2020, 0, i + 1), {
            net: 40 + Math.floor(i * 1.5),
          }),
        ) as FortuneReport[];

        const result = analyzeScoreVolatility.call(ViewAggregator, reports);

        expect(result.trend).toBe('increasing');
        expect(result.min).toBe(40);
        expect(result.max).toBeGreaterThan(65);
      });

      it('should detect decreasing trend', () => {
        const analyzeScoreVolatility = getPrivateMethod(
          'analyzeScoreVolatility',
        );

        const reports = Array.from({ length: 20 }, (_, i) =>
          createMockReport(new Date(2020, 0, i + 1), {
            net: 70 - Math.floor(i * 1.5),
          }),
        ) as FortuneReport[];

        const result = analyzeScoreVolatility.call(ViewAggregator, reports);

        expect(result.trend).toBe('decreasing');
        expect(result.min).toBeLessThan(45);
        expect(result.max).toBe(70);
      });

      it('should classify moderate swings correctly', () => {
        const analyzeScoreVolatility = getPrivateMethod(
          'analyzeScoreVolatility',
        );

        // Real case: Scores fluctuating moderately with upward trend
        // stdDev < 20 (not volatile), but secondAvg - firstAvg > 10 (increasing)
        const reports = Array.from({ length: 20 }, (_, i) =>
          createMockReport(new Date(2020, 0, i + 1), {
            net: 40 + Math.floor((i % 4) * 2) + Math.floor(i * 1.2), // Moderate variance + clear increase
          }),
        ) as FortuneReport[];

        const result = analyzeScoreVolatility.call(ViewAggregator, reports);

        expect(result.trend).toBe('increasing'); // Should detect upward trend
        expect(result.standardDeviation).toBeGreaterThan(5); // Not stable
        expect(result.standardDeviation).toBeLessThan(20); // Not volatile
      });
    });

    describe('analyzeTriggerPatterns()', () => {
      it('should filter out rare triggers (<5% frequency)', () => {
        const analyzeTriggerPatterns = getPrivateMethod(
          'analyzeTriggerPatterns',
        );

        const reports = Array.from({ length: 100 }, (_, i) => {
          const triggers = [];
          if (i < 50)
            triggers.push({ type: 'TriggerA', involvesFavorable: true });
          if (i < 10)
            triggers.push({
              type: 'TriggerB',
              involvesFavorable: false,
              involvesUnfavorable: true,
            });
          if (i < 3) triggers.push({ type: 'TriggerC' });
          return createMockReport(
            new Date(2020, 0, i + 1),
            { net: 50 },
            triggers,
          );
        }) as FortuneReport[];

        const result = analyzeTriggerPatterns.call(ViewAggregator, reports, 5);

        expect(result.filteringApplied.totalUniqueTriggers).toBe(3);
        expect(result.filteringApplied.significantTriggers).toBe(2);
        expect(result.filteringApplied.filteredOutTriggers).toBe(1);

        expect(result.patterns).toHaveLength(2);
        expect(result.patterns[0].type).toBe('TriggerA');
        expect(result.patterns[0].percentage).toBe(50);
        expect(result.patterns[1].type).toBe('TriggerB');
        expect(result.patterns[1].percentage).toBe(10);
      });

      it('should calculate favorableRatio correctly', () => {
        const analyzeTriggerPatterns = getPrivateMethod(
          'analyzeTriggerPatterns',
        );

        const reports = Array.from({ length: 100 }, (_, i) => {
          const triggers = [];
          if (i < 30)
            triggers.push({ type: 'TriggerA', involvesFavorable: true });
          else if (i < 50)
            triggers.push({ type: 'TriggerA', involvesUnfavorable: true });
          return createMockReport(
            new Date(2020, 0, i + 1),
            { net: 50 },
            triggers,
          );
        }) as FortuneReport[];

        const result = analyzeTriggerPatterns.call(ViewAggregator, reports, 5);

        expect(result.patterns).toHaveLength(1);
        expect(result.patterns[0].favorableRatio).toBeCloseTo(0.6, 1);
      });

      it('should handle triggers with no favorability flags', () => {
        const analyzeTriggerPatterns = getPrivateMethod(
          'analyzeTriggerPatterns',
        );

        // Real case: Library might return triggers without favorable/unfavorable flags
        const reports = Array.from({ length: 100 }, (_, i) => {
          const triggers = [];
          if (i < 30) triggers.push({ type: 'NeutralTrigger' }); // No flags
          return createMockReport(
            new Date(2020, 0, i + 1),
            { net: 50 },
            triggers,
          );
        }) as FortuneReport[];

        const result = analyzeTriggerPatterns.call(ViewAggregator, reports, 5);

        expect(result.patterns).toHaveLength(1);
        expect(result.patterns[0].favorableRatio).toBe(0.5); // Neutral triggers = 0.5
      });

      it('should keep triggers appearing exactly at 5% threshold', () => {
        const analyzeTriggerPatterns = getPrivateMethod(
          'analyzeTriggerPatterns',
        );

        // Real case: Exactly 5% frequency (5 out of 100 days)
        const reports = Array.from({ length: 100 }, (_, i) => {
          const triggers = [];
          if (i < 5) triggers.push({ type: 'ThresholdTrigger' }); // Exactly 5%
          return createMockReport(
            new Date(2020, 0, i + 1),
            { net: 50 },
            triggers,
          );
        }) as FortuneReport[];

        const result = analyzeTriggerPatterns.call(ViewAggregator, reports, 5);

        expect(result.patterns).toHaveLength(1); // Should be KEPT (not filtered)
        expect(result.patterns[0].type).toBe('ThresholdTrigger');
        expect(result.patterns[0].percentage).toBe(5);
      });
    });

    describe('findConsecutivePeriods()', () => {
      it('should find single consecutive period', () => {
        const findConsecutivePeriods = getPrivateMethod(
          'findConsecutivePeriods',
        );

        const reports = Array.from({ length: 10 }, (_, i) =>
          createMockReport(new Date(2020, 0, i + 1), { net: 50 }),
        ) as FortuneReport[];

        const condition = (report: FortuneReport) => {
          const day = report.startDate.getDate();
          return day >= 3 && day <= 7;
        };

        const periods = findConsecutivePeriods.call(
          ViewAggregator,
          reports,
          condition,
        );

        expect(periods).toHaveLength(1);
        expect(periods[0].reports).toHaveLength(5);
        expect(periods[0].start).toEqual(new Date(2020, 0, 3));
        expect(periods[0].end).toEqual(new Date(2020, 0, 7));
      });

      it('should find multiple consecutive periods', () => {
        const findConsecutivePeriods = getPrivateMethod(
          'findConsecutivePeriods',
        );

        const reports = Array.from({ length: 10 }, (_, i) =>
          createMockReport(new Date(2020, 0, i + 1), { net: 50 }),
        ) as FortuneReport[];

        const condition = (report: FortuneReport) => {
          const day = report.startDate.getDate();
          return (day >= 2 && day <= 3) || (day >= 6 && day <= 8);
        };

        const periods = findConsecutivePeriods.call(
          ViewAggregator,
          reports,
          condition,
        );

        expect(periods).toHaveLength(2);
        expect(periods[0].reports).toHaveLength(2);
        expect(periods[1].reports).toHaveLength(3);
      });
    });

    describe('aggregateLuckySymbols() with frequency', () => {
      it('should weight lucky numbers by frequency', () => {
        const aggregateLuckySymbols = getPrivateMethod('aggregateLuckySymbols');

        const reports = Array.from({ length: 100 }, (_, i) => {
          const numbers = [];
          if (i < 45) numbers.push(3);
          if (i < 30) numbers.push(7);
          if (i < 15) numbers.push(5);
          if (i < 10) numbers.push(9);
          return createMockReport(
            new Date(2020, 0, i + 1),
            { net: 50 },
            [],
            numbers,
          );
        }) as FortuneReport[];

        const result = aggregateLuckySymbols.call(ViewAggregator, reports);

        expect(result.numbers[0]).toBe(3);
        expect(result.numbers[1]).toBe(7);
        expect(result.numbers[2]).toBe(5);
        expect(result.numbers[3]).toBe(9);

        expect(result.numbersWithFrequency).toBeDefined();
        expect(result.numbersWithFrequency![0].number).toBe(3);
        expect(result.numbersWithFrequency![0].percentage).toBe(45);
        expect(result.numbersWithFrequency![1].percentage).toBe(30);
      });

      it('should sort consistently when numbers appear equally often', () => {
        const aggregateLuckySymbols = getPrivateMethod('aggregateLuckySymbols');

        // Real case: Multiple numbers with same frequency (e.g., 33%)
        const reports = Array.from({ length: 99 }, (_, i) => {
          const numbers = [];
          if (i < 33) numbers.push(3, 7, 9); // All appear 33 times
          return createMockReport(
            new Date(2020, 0, i + 1),
            { net: 50 },
            [],
            numbers,
          );
        }) as FortuneReport[];

        const result = aggregateLuckySymbols.call(ViewAggregator, reports);

        // Should have all 3 numbers with same percentage
        expect(result.numbersWithFrequency).toHaveLength(3);
        expect(result.numbersWithFrequency![0].percentage).toBe(33);
        expect(result.numbersWithFrequency![1].percentage).toBe(33);
        expect(result.numbersWithFrequency![2].percentage).toBe(33);

        // Order should be consistent (even if arbitrary)
        const firstRun = result.numbers;
        const secondResult = aggregateLuckySymbols.call(
          ViewAggregator,
          reports,
        );
        expect(secondResult.numbers).toEqual(firstRun); // Deterministic
      });
    });

    describe('aggregateSpecialStars() with period clustering', () => {
      it('should cluster consecutive activation periods', () => {
        const aggregateSpecialStars = getPrivateMethod('aggregateSpecialStars');

        // Create 30 reports, star active on days 5-12 (8 days) and 20-27 (8 days)
        const reports = Array.from({ length: 30 }, (_, i) => {
          const day = i + 1;
          const stars =
            (day >= 5 && day <= 12) || (day >= 20 && day <= 27)
              ? ['Peach Blossom']
              : [];
          return createMockReport(
            new Date(2020, 0, day),
            { net: 50 },
            [],
            [],
            stars,
          );
        }) as FortuneReport[];

        const result = aggregateSpecialStars.call(ViewAggregator, reports);

        expect(result).toHaveLength(1);
        expect(result[0].name).toBe('Peach Blossom');
        expect(result[0].activePeriods).toHaveLength(2);
        expect(result[0].activePeriods![0].durationDays).toBe(8);
        expect(result[0].activePeriods![1].durationDays).toBe(8);
        expect(result[0].totalActiveDays).toBe(16);
        expect(result[0].activePercentage).toBe(53); // 16/30 = 53%
      });

      it('should filter out short periods (<7 days)', () => {
        const aggregateSpecialStars = getPrivateMethod('aggregateSpecialStars');

        const reports = Array.from({ length: 30 }, (_, i) => {
          const day = i + 1;
          const stars = [];
          if (day >= 5 && day <= 14) stars.push('Star A'); // 10 days
          if (day >= 20 && day <= 22) stars.push('Star B'); // 3 days
          return createMockReport(
            new Date(2020, 0, day),
            { net: 50 },
            [],
            [],
            stars,
          );
        }) as FortuneReport[];

        const result = aggregateSpecialStars.call(ViewAggregator, reports);

        expect(result).toHaveLength(1);
        expect(result[0].name).toBe('Star A');
      });

      it('should keep periods lasting exactly 7 days', () => {
        const aggregateSpecialStars = getPrivateMethod('aggregateSpecialStars');

        // Real case: Weekly events (exactly 7 days)
        const reports = Array.from({ length: 30 }, (_, i) => {
          const day = i + 1;
          const stars =
            day >= 10 && day <= 16 // Days 10-16 = exactly 7 days
              ? ['Sky Horse']
              : [];
          return createMockReport(
            new Date(2020, 0, day),
            { net: 50 },
            [],
            [],
            stars,
          );
        }) as FortuneReport[];

        const result = aggregateSpecialStars.call(ViewAggregator, reports);

        expect(result).toHaveLength(1);
        expect(result[0].name).toBe('Sky Horse');
        expect(result[0].activePeriods).toHaveLength(1);
        expect(result[0].activePeriods![0].durationDays).toBe(7); // Exactly 7 days
        expect(result[0].totalActiveDays).toBe(7);
      });
    });
  });
});
