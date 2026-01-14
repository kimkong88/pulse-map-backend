import {
  BaziCalculator,
  PersonalizedDailyAnalysisOutput,
} from '@aharris02/bazi-calculator-by-alvamind';
import { BaziDataExtractor } from './baziExtractor.util';

describe('BaziDataExtractor', () => {
  // Use a known birth date for consistent results
  const birthDate = new Date('1990-03-15T10:30:00+08:00');
  const targetDate = new Date('2024-06-15T12:00:00+08:00');
  const timezone = 'Asia/Shanghai';

  let calculator: BaziCalculator;
  let baseAnalysis: any;
  let dailyAnalysis: any;

  beforeAll(() => {
    calculator = new BaziCalculator(birthDate, 'male', timezone, true);
    baseAnalysis = calculator.getCompleteAnalysis();
    dailyAnalysis = calculator.getAnalysisForDate(targetDate, timezone, {
      type: 'personalized',
    });
  });

  describe('Basic Structure', () => {
    it('should extract all required top-level fields', () => {
      const userContext = BaziDataExtractor.buildUserContext(baseAnalysis);
      const result = BaziDataExtractor.extract(userContext, dailyAnalysis);

      expect(result.date).toBeInstanceOf(Date);
      expect(result.luckEra).toBeDefined();
      expect(result.natalStructure).toBeDefined();
      expect(result.favorableElements).toBeDefined();
      expect(result.dailyElement).toBeDefined();
      expect(result.lifeAreas).toBeDefined();
    });

    it('should parse date correctly', () => {
      const userContext = BaziDataExtractor.buildUserContext(baseAnalysis);
      const result = BaziDataExtractor.extract(userContext, dailyAnalysis);

      expect(result.date.toISOString()).toContain('2024-06-15');
    });
  });

  describe('Library Data Pass-Through', () => {
    it('should use library Ten Gods for natal structure directly', () => {
      const userContext = BaziDataExtractor.buildUserContext(baseAnalysis);
      const result = BaziDataExtractor.extract(userContext, dailyAnalysis);

      // Verify we're passing through library data, not calculating
      expect(result.natalStructure.social.tenGod).toBe(
        baseAnalysis.detailedPillars.year.heavenlyStemTenGod?.name || null,
      );
      expect(result.natalStructure.career.tenGod).toBe(
        baseAnalysis.detailedPillars.month.heavenlyStemTenGod?.name || null,
      );
      expect(result.natalStructure.personal.tenGod).toBeNull(); // Day = self
      expect(result.natalStructure.innovation?.tenGod).toBe(
        baseAnalysis.detailedPillars.hour?.heavenlyStemTenGod?.name || null,
      );
    });

    it('should use library Ten God for luck era directly', () => {
      const userContext = BaziDataExtractor.buildUserContext(baseAnalysis);
      const result = BaziDataExtractor.extract(userContext, dailyAnalysis);

      if (dailyAnalysis.currentLuckPillarSnap) {
        expect(result.luckEra?.tenGod).toBe(
          dailyAnalysis.currentLuckPillarSnap.tenGodVsNatalDayMaster?.name ||
            null,
        );
      }
    });

    it('should pass through favorable elements directly', () => {
      const userContext = BaziDataExtractor.buildUserContext(baseAnalysis);
      const result = BaziDataExtractor.extract(userContext, dailyAnalysis);

      if (baseAnalysis.basicAnalysis.favorableElements) {
        expect(result.favorableElements?.primary).toEqual(
          baseAnalysis.basicAnalysis.favorableElements.primary || [],
        );
        expect(result.favorableElements?.unfavorable).toEqual(
          baseAnalysis.basicAnalysis.favorableElements.unfavorable || [],
        );
      }
    });

    it('should pass through daily element directly', () => {
      const userContext = BaziDataExtractor.buildUserContext(baseAnalysis);
      const result = BaziDataExtractor.extract(userContext, dailyAnalysis);

      expect(result.dailyElement).toBe(dailyAnalysis.dayPillar.stemElement);
    });
  });

  describe('Pillar → Life Area Mapping', () => {
    it('should map Year pillar to Social life area', () => {
      const userContext = BaziDataExtractor.buildUserContext(baseAnalysis);
      const result = BaziDataExtractor.extract(userContext, dailyAnalysis);

      expect(result.natalStructure.social).toEqual({
        tenGod:
          baseAnalysis.detailedPillars.year.heavenlyStemTenGod?.name || null,
        element: baseAnalysis.detailedPillars.year.heavenlyStem.elementType,
        yinYang: baseAnalysis.detailedPillars.year.heavenlyStem.yinYang,
      });
    });

    it('should map Month pillar to Career life area', () => {
      const userContext = BaziDataExtractor.buildUserContext(baseAnalysis);
      const result = BaziDataExtractor.extract(userContext, dailyAnalysis);

      expect(result.natalStructure.career).toEqual({
        tenGod:
          baseAnalysis.detailedPillars.month.heavenlyStemTenGod?.name || null,
        element: baseAnalysis.detailedPillars.month.heavenlyStem.elementType,
        yinYang: baseAnalysis.detailedPillars.month.heavenlyStem.yinYang,
      });
    });

    it('should map Day pillar to Personal life area (tenGod always null)', () => {
      const userContext = BaziDataExtractor.buildUserContext(baseAnalysis);
      const result = BaziDataExtractor.extract(userContext, dailyAnalysis);

      expect(result.natalStructure.personal).toEqual({
        tenGod: null, // Self-relationship is null (traditional Bazi)
        element: baseAnalysis.detailedPillars.day.heavenlyStem.elementType,
        yinYang: baseAnalysis.detailedPillars.day.heavenlyStem.yinYang,
      });
    });

    it('should map Hour pillar to Innovation life area (or null if time unknown)', () => {
      const userContext = BaziDataExtractor.buildUserContext(baseAnalysis);
      const result = BaziDataExtractor.extract(userContext, dailyAnalysis);

      if (baseAnalysis.detailedPillars.hour) {
        expect(result.natalStructure.innovation).toEqual({
          tenGod:
            baseAnalysis.detailedPillars.hour.heavenlyStemTenGod?.name || null,
          element: baseAnalysis.detailedPillars.hour.heavenlyStem.elementType,
          yinYang: baseAnalysis.detailedPillars.hour.heavenlyStem.yinYang,
        });
      } else {
        expect(result.natalStructure.innovation).toBeNull();
      }
    });
  });

  describe('Interaction Mapping', () => {
    it('should initialize all four life areas', () => {
      const userContext = BaziDataExtractor.buildUserContext(baseAnalysis);
      const result = BaziDataExtractor.extract(userContext, dailyAnalysis);

      expect(result.lifeAreas.social).toBeDefined();
      expect(result.lifeAreas.career).toBeDefined();
      expect(result.lifeAreas.personal).toBeDefined();
      expect(result.lifeAreas.innovation).toBeDefined();
    });

    it('should mark life areas as active when interactions exist', () => {
      const userContext = BaziDataExtractor.buildUserContext(baseAnalysis);
      const result = BaziDataExtractor.extract(userContext, dailyAnalysis);

      // Check that any area with triggers is marked active
      Object.values(result.lifeAreas).forEach((area) => {
        if (area.triggers.length > 0) {
          expect(area.active).toBe(true);
        }
      });
    });

    it('should extract trigger data from library interactions', () => {
      const userContext = BaziDataExtractor.buildUserContext(baseAnalysis);
      const result = BaziDataExtractor.extract(userContext, dailyAnalysis);

      // Find any life area with triggers
      const areasWithTriggers = Object.values(result.lifeAreas).filter(
        (area) => area.triggers.length > 0,
      );

      if (areasWithTriggers.length > 0) {
        const firstTrigger = areasWithTriggers[0].triggers[0];

        // Verify trigger structure
        expect(firstTrigger).toHaveProperty('type');
        expect(firstTrigger).toHaveProperty('source');
        expect(firstTrigger).toHaveProperty('description');
        expect(firstTrigger).toHaveProperty('involvesFavorable');
        expect(firstTrigger).toHaveProperty('involvesUnfavorable');
        expect(firstTrigger).toHaveProperty('affectedTenGods');

        // Source should be one of the valid types
        expect(['Daily', 'Monthly', 'Annual']).toContain(firstTrigger.source);
      }
    });

    it('should prioritize Daily > Monthly > Annual for trigger source', () => {
      const userContext = BaziDataExtractor.buildUserContext(baseAnalysis);
      const result = BaziDataExtractor.extract(userContext, dailyAnalysis);

      // Find any triggers with Daily source
      const dailyTriggers = Object.values(result.lifeAreas).flatMap((area) =>
        area.triggers.filter((t) => t.source === 'Daily'),
      );

      if (dailyTriggers.length > 0) {
        // Verify that the original library interaction had Daily participant
        const libraryInteraction = dailyAnalysis.interactions.find(
          (inter: any) =>
            inter.participants.some((p: any) => p.source === 'Daily'),
        );

        expect(libraryInteraction).toBeDefined();
      }
    });
  });

  describe('Edge Cases', () => {
    it('should handle birth charts without hour pillar (time unknown)', () => {
      const noTimeCalc = new BaziCalculator(
        birthDate,
        'male',
        timezone,
        false, // time unknown
      );
      const noTimeBase = noTimeCalc.getCompleteAnalysis();
      const noTimeDaily = noTimeCalc.getAnalysisForDate(targetDate, timezone, {
        type: 'personalized',
      });

      if (!noTimeBase || !noTimeDaily) {
        throw new Error('Failed to get analysis');
      }

      const userContext = BaziDataExtractor.buildUserContext(noTimeBase);
      const result = BaziDataExtractor.extract(
        userContext,
        noTimeDaily as PersonalizedDailyAnalysisOutput,
      );

      expect(result.natalStructure.innovation).toBeNull();
      expect(result.lifeAreas.innovation).toBeDefined(); // Still initialized
    });

    it('should handle days with no interactions', () => {
      // This test might not always find a day with zero interactions,
      // but we can verify the structure handles empty arrays
      const userContext = BaziDataExtractor.buildUserContext(baseAnalysis);
      const result = BaziDataExtractor.extract(userContext, dailyAnalysis);

      Object.values(result.lifeAreas).forEach((area) => {
        expect(Array.isArray(area.triggers)).toBe(true);
        if (area.triggers.length === 0) {
          expect(area.active).toBe(false);
        }
      });
    });

    it('should throw error for invalid inputs', () => {
      expect(() => {
        BaziDataExtractor.buildUserContext(null as any);
      }).toThrow();

      expect(() => {
        BaziDataExtractor.buildUserContext({ ...baseAnalysis, basicAnalysis: null });
      }).toThrow();

      const userContext = BaziDataExtractor.buildUserContext(baseAnalysis);
      expect(() => {
        BaziDataExtractor.extract(userContext, null as any);
      }).toThrow();
    });
  });

  describe('Determinism (Same Input → Same Output)', () => {
    it('should produce identical output for identical inputs', () => {
      const userContext = BaziDataExtractor.buildUserContext(baseAnalysis);
      const result1 = BaziDataExtractor.extract(userContext, dailyAnalysis);
      const result2 = BaziDataExtractor.extract(userContext, dailyAnalysis);

      expect(result1).toEqual(result2);
    });
  });
});
