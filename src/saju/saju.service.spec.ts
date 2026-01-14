import { Test, TestingModule } from '@nestjs/testing';
import { SajuService } from './saju.service';

describe('SajuService', () => {
  let service: SajuService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [SajuService],
    }).compile();

    service = module.get<SajuService>(SajuService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('getChapterAnalysis', () => {
    it('should generate LLMPromptContext for Chapter 1 (0-19 years)', async () => {
      // Arrange
      const birthDate = new Date('1990-01-15T08:00:00-05:00');
      const gender = 'male';
      const timezone = 'America/New_York';

      // Act
      const result = await service.getChapterAnalysis(
        birthDate,
        gender,
        timezone,
        timezone,
        true,
        1, // Chapter 1: 0-19 years
      );

      // Assert: LLMPromptContext structure
      expect(result).toBeDefined();
      expect(result.timeframe).toBe('chapter');
      expect(result.periodLabel).toContain('Age');

      // Assert: Day Master context
      expect(result.dayMaster).toBeDefined();
      expect(result.dayMaster.element).toBeDefined();
      expect(result.dayMaster.yinYang).toBeDefined();
      expect(result.dayMaster.chineseName).toBeDefined();
      expect(result.dayMaster.meaning).toBeDefined();

      // Assert: Ten God context (comprehensive meanings)
      expect(result.tenGodContext).toBeDefined();
      expect(result.tenGodContext.career).toBeDefined();
      expect(result.tenGodContext.career.natalMeaning).toBeDefined();
      expect(result.tenGodContext.wealth).toBeDefined();
      expect(result.tenGodContext.relationships).toBeDefined();
      expect(result.tenGodContext.wellness).toBeDefined();
      expect(result.tenGodContext.personalGrowth).toBeDefined();

      // Assert: Element cycle explanations
      expect(result.elementCycleExplanation).toBeDefined();
      expect(typeof result.elementCycleExplanation).toBe('string');
      expect(result.periodElementRelationship).toBeDefined();

      // Assert: Luck era context
      expect(result.luckEraContext).toBeDefined();

      // Assert: Interactions with traditional meanings
      expect(result.interactions).toBeDefined();
      expect(Array.isArray(result.interactions)).toBe(true);

      // Assert: Scores from chapter report
      expect(result.scores).toBeDefined();
      expect(result.scores.overall).toBeGreaterThanOrEqual(0);
      expect(result.scores.overall).toBeLessThanOrEqual(100);

      console.log('Chapter 1 LLM Context Sample:');
      console.log('- Timeframe:', result.timeframe);
      console.log('- Period Label:', result.periodLabel);
      console.log('- Day Master:', result.dayMaster.chineseName, result.dayMaster.meaning);
      console.log('- Overall Score:', result.scores.overall);
      console.log('- Career Ten God:', result.tenGodContext.career.natal);
      console.log('- Element Cycle:', result.elementCycleExplanation.substring(0, 100) + '...');
      console.log('- Interactions Count:', result.interactions.length);
    }, 30000); // 30 second timeout (sampling 20 years takes time)

    it('should generate different contexts for different chapters', async () => {
      // Arrange
      const birthDate = new Date('1990-01-15T08:00:00-05:00');
      const gender = 'male';
      const timezone = 'America/New_York';

      // Act
      const chapter1 = await service.getChapterAnalysis(
        birthDate,
        gender,
        timezone,
        timezone,
        true,
        1,
      );

      const chapter2 = await service.getChapterAnalysis(
        birthDate,
        gender,
        timezone,
        timezone,
        true,
        2,
      );

      // Assert: Different chapters should have different period labels
      expect(chapter1.periodLabel).not.toBe(chapter2.periodLabel);

      // Assert: Scores may differ (different luck eras)
      // Note: They might be the same, but the context should differ
      console.log('Chapter 1 vs Chapter 2:');
      console.log('- Chapter 1 Period:', chapter1.periodLabel);
      console.log('- Chapter 2 Period:', chapter2.periodLabel);
      console.log('- Chapter 1 Score:', chapter1.scores.overall);
      console.log('- Chapter 2 Score:', chapter2.scores.overall);
    }, 60000); // 60 second timeout
  });
});

