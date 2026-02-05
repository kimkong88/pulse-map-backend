import { Injectable, Logger } from '@nestjs/common';
import {
  BaziCalculator,
  PersonalizedDailyAnalysisOutput,
  CompleteAnalysis,
  ElementType,
  InteractionDetail,
} from '@aharris02/bazi-calculator-by-alvamind';
import { addYears, addDays} from 'date-fns';
import { toDate, formatInTimeZone } from 'date-fns-tz';
import { generateText, Output } from 'ai';
import { z } from 'zod';
import { BaziDataExtractor } from './utils/baziExtractor.util';
import { ViewAggregator } from './utils/viewAggregator.util';
import { LLMContextBuilder } from './utils/llmContextBuilder.util';
import {
  RawBaziData,
  FortuneReport,
  UserContext,
  CompatibilityReport,
} from './types';
import { generateIntroductionPrompt } from './prompts/personalAnalysis.prompts';
import { generateConclusionPrompt } from './prompts/conclusion.prompts';
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
import { getLuckCycleTheme } from './utils/luckCycleThemes.util';
import { extractActiveTenGods } from '../forecast/utils/activeTenGods.util';

@Injectable()
export class SajuService {
  private readonly logger = new Logger(SajuService.name);

  constructor() {}

  /**
   * Get basic profile data for /me endpoint
   * Fast, no LLM calls - only factual calculations
   * Returns: identity, overall rarity, special traits
   */
  async getBasicProfile(
    birthDateTime: Date,
    gender: 'male' | 'female',
    birthTimezone: string,
    isTimeKnown: boolean,
    currentTimezone?: string,
  ) {
    // Debug logging
    this.logger.log('🔍 getBasicProfile inputs:');
    this.logger.log(
      JSON.stringify(
        {
          birthDateTime,
          gender,
          birthTimezone,
          isTimeKnown,
          currentTimezone,
        },
        null,
        2,
      ),
    );

    // Initialize calculator and build user context
    const baseCalculator = new BaziCalculator(
      birthDateTime,
      gender,
      birthTimezone,
      isTimeKnown,
    );
    const baseAnalysis = baseCalculator.getCompleteAnalysis();

    // Debug logging for Day Master
    this.logger.log(
      `🔍 Day Master: stem=${baseAnalysis?.detailedPillars?.day?.heavenlyStem}, branch=${baseAnalysis?.detailedPillars?.day?.earthlyBranch}`,
    );

    if (!baseAnalysis) {
      throw new Error('SajuService: getCompleteAnalysis returned null.');
    }

    // Build user context (natal characteristics)
    const userContext = BaziDataExtractor.buildUserContext(baseAnalysis);

    // Generate identity (fast calculation, no LLM)
    const identity = this.generateIdentity(userContext);
    this.logger.log(`🔍 Generated identity: ${JSON.stringify(identity)}`);

    // Get special traits (patterns + special stars)
    const specialTraits = this.getSpecialTraits(userContext);
    this.logger.log(`🔍 Special traits count: ${specialTraits.length}`);

    // Calculate overall rarity
    const elementDistribution = this.calculateElementDistribution(userContext);
    const rarity = this.calculateRarity(
      identity.code,
      userContext,
      elementDistribution,
    );

    // Get luck cycle themes (use currentTimezone if provided, otherwise use birthTimezone)
    const luckCycles = await this.getLuckCycles(
      birthDateTime,
      gender,
      birthTimezone,
      isTimeKnown,
      currentTimezone || birthTimezone,
    );

    return {
      identity: {
        code: identity.code,
        title: identity.title,
        element: identity.element,
        polarity: identity.polarity,
      },
      rarity: {
        oneIn: rarity.overall.oneIn,
        description: rarity.overall.description,
      },
      specialTraits: specialTraits.map((trait) => ({
        name: trait.name,
        chineseName: trait.chineseName,
        description: trait.description,
        rarity: trait.rarity || 'Common',
        emoji: trait.emoji,
      })),
      luckCycles,
    };
  }

  /**
   * Get current and next luck cycles with themes
   * Returns: current luck cycle + next luck cycle, each with emoji, title, description, technical basis
   */
  async getLuckCycles(
    birthDateTime: Date,
    gender: 'male' | 'female',
    birthTimezone: string,
    isTimeKnown: boolean,
    currentTimezone: string,
  ) {
    // Initialize calculator
    const calculator = new BaziCalculator(
      birthDateTime,
      gender,
      birthTimezone,
      isTimeKnown,
    );
    const baseAnalysis = calculator.getCompleteAnalysis();

    if (!baseAnalysis) {
      throw new Error('SajuService: getCompleteAnalysis returned null.');
    }

    // Build user context for favorable elements and patterns
    const userContext = BaziDataExtractor.buildUserContext(baseAnalysis);

    // Get current date (needed for all cases)
    const nowDate = new Date();
    const currentYear = nowDate.getFullYear();

    // Get all luck pillars
    const allLuckPillars = baseAnalysis.luckPillars?.pillars || [];

    if (allLuckPillars.length === 0) {
      // Pre-Luck Era - no luck pillars yet
      const currentTheme = getLuckCycleTheme({
        tenGod: null,
        stemElement: 'WOOD' as ElementType, // placeholder
        branchLifeCycle: null,
        favorableElements: userContext.favorableElements || {
          primary: [],
          secondary: [],
          unfavorable: [],
        },
        natalPatterns: userContext.natalPatterns,
        chartStrength: userContext.chartStrength,
      });

      // For Pre-Luck Era with no pillars, we can't calculate remaining time precisely
      // Return zeros (this is a rare edge case)
      return {
        current: {
          emoji: currentTheme.emoji,
          title: currentTheme.title,
          description: currentTheme.description,
          remainingTime: { years: 0, months: 0, days: 0, hours: 0, minutes: 0 },
          technicalBasis: [
            'Pre-Luck Era: Major luck cycles (大運) have not yet begun',
            'This period focuses on foundational development and early life experiences',
          ],
        },
        next: null,
      };
    }

    // Calculate current age to validate cycle detection
    const currentAge = Math.floor((nowDate.getTime() - birthDateTime.getTime()) / (1000 * 60 * 60 * 24 * 365.25));
    const birthYear = birthDateTime.getFullYear();
    
    // When time is unknown, the library doesn't populate yearStart/yearEnd for pillars 1-11
    // We need to calculate approximate year ranges ourselves
    // Typical pattern: Pillar 0 (Pre-Luck Era) lasts ~8-10 years, then each cycle is 10 years
    // Estimate: Pillar 1 starts around age 8-10 (varies by birth timing)
    // For approximation, we'll use age 8 as the start of Pillar 1
    const estimatedFirstPillarStartAge = 8;
    const estimatedFirstPillarStartYear = birthYear + estimatedFirstPillarStartAge;
    
    // Fill in missing yearStart/yearEnd for pillars when time is unknown
    if (!isTimeKnown) {
      for (let i = 1; i < allLuckPillars.length; i++) {
        const pillar = allLuckPillars[i];
        if (pillar.yearStart === null || pillar.yearEnd === null) {
          // Calculate approximate year range: Pillar 1 starts at estimatedFirstPillarStartYear
          // Each subsequent pillar starts 10 years later
          const pillarStartYear = estimatedFirstPillarStartYear + (i - 1) * 10;
          const pillarEndYear = pillarStartYear + 9; // 10-year cycle
          // Note: We're modifying the pillar object directly - this is safe as it's a local copy
          (pillar as any).yearStart = pillarStartYear;
          (pillar as any).yearEnd = pillarEndYear;
          // Also calculate approximate ageStart for consistency
          (pillar as any).ageStart = estimatedFirstPillarStartAge + (i - 1) * 10;
          this.logger.log(`📅 Estimated Pillar ${i}: ageStart=${(pillar as any).ageStart}, yearStart=${pillarStartYear}, yearEnd=${pillarEndYear}`);
        }
      }
    }
    
    // Get current luck pillar using calculator (more complete data)
    // Note: getCurrentLuckPillar may return null due to date comparison issues
    // (library uses Jan 1 as endTime approximation, but cycles actually end exactly 10 years from startTime)
    // Cycles don't start at birth - there's a Pre-Luck Era buffer, then each cycle lasts exactly 10 years
    // We use age-based detection instead, which is more reliable
    const currentLuckPillarFromCalc = calculator.getCurrentLuckPillar(nowDate);
    
    // Get daily analysis for today to extract correct Ten God and element (relative to Day Master)
    // Note: currentLuckPillarSnap may not exist if getCurrentLuckPillar returns null
    const todayAnalysis = calculator.getAnalysisForDate(nowDate, currentTimezone, {
      type: 'personalized',
    }) as PersonalizedDailyAnalysisOutput;
    
    // Debug: Log daily analysis structure
    this.logger.log(`🔍 Daily Analysis Debug:`);
    this.logger.log(`  - currentLuckPillarSnap exists: ${!!todayAnalysis?.currentLuckPillarSnap}`);
    if (todayAnalysis?.currentLuckPillarSnap) {
      this.logger.log(`  - tenGodVsNatalDayMaster: ${JSON.stringify(todayAnalysis.currentLuckPillarSnap.tenGodVsNatalDayMaster)}`);
      this.logger.log(`  - stemElement: ${todayAnalysis.currentLuckPillarSnap.stemElement}`);
    }
    
    // Extract Ten God and element from daily analysis (this is the correct way for luck pillars)
    const currentTenGodFromDaily = todayAnalysis?.currentLuckPillarSnap?.tenGodVsNatalDayMaster?.name || null;
    // Get element from currentLuckPillarSnap (this is the luck pillar's stem element)
    const currentStemElementFromDaily = todayAnalysis?.currentLuckPillarSnap?.stemElement as ElementType | undefined;
    
    // Find current luck pillar index in array
    let currentLuckPillar = null;
    let currentIndex = -1;

    // Debug: Log all pillars to understand structure
    this.logger.log(`🔍 All Luck Pillars Debug:`);
    this.logger.log(`  - Total pillars: ${allLuckPillars.length}`);
    for (let i = 0; i < Math.min(allLuckPillars.length, 5); i++) {
      const p = allLuckPillars[i];
      this.logger.log(`  - Pillar ${i}: ageStart=${p.ageStart}, yearStart=${p.yearStart}, yearEnd=${p.yearEnd}, stem=${p.heavenlyStem?.character || 'null'}, branch=${p.earthlyBranch?.character || 'null'}`);
    }

    if (currentLuckPillarFromCalc) {
      // Find matching pillar in array
      for (let i = 0; i < allLuckPillars.length; i++) {
        const pillar = allLuckPillars[i];
        // Skip Pillar 0 (Pre-Luck Era) which has ageStart: null
        if (pillar.ageStart === null || pillar.ageStart === undefined) {
          continue;
        }
        if (
          pillar.yearStart === currentLuckPillarFromCalc.yearStart &&
          pillar.heavenlyStem?.character === currentLuckPillarFromCalc.heavenlyStem?.character &&
          pillar.earthlyBranch?.character === currentLuckPillarFromCalc.earthlyBranch?.character
        ) {
          // Validate: current age must be within this cycle's age range
          const pillarAgeEnd = pillar.ageStart + 9;
          if (currentAge >= pillar.ageStart && currentAge <= pillarAgeEnd) {
            // Use pillar from array (should have Ten God if library processed it)
            // Only use currentLuckPillarFromCalc if array pillar doesn't have Ten God
            currentLuckPillar = pillar.heavenlyStemTenGod ? pillar : currentLuckPillarFromCalc;
            currentIndex = i;
            this.logger.log(`✅ Found current pillar via calculator match: index ${i}, ageStart=${pillar.ageStart}`);
            break;
          }
          // If age doesn't match, continue searching (calculator might be wrong)
        }
      }
    }

    // Fallback: find by age range if calculator didn't return or age didn't match
    if (!currentLuckPillar) {
      this.logger.log(`🔍 Searching by age range (currentAge=${currentAge})...`);
      for (let i = 0; i < allLuckPillars.length; i++) {
        const pillar = allLuckPillars[i];
        // Skip Pillar 0 (Pre-Luck Era) which has ageStart: null
        if (pillar.ageStart === null || pillar.ageStart === undefined) {
          this.logger.log(`  - Skipping Pillar ${i} (ageStart is null)`);
          continue;
        }
        const pillarAgeEnd = pillar.ageStart + 9;
        // Check if current age is within this pillar's age range
        if (currentAge >= pillar.ageStart && currentAge <= pillarAgeEnd) {
          currentLuckPillar = pillar;
          currentIndex = i;
          this.logger.log(`✅ Found current pillar via age range: index ${i}, ageStart=${pillar.ageStart}, ageEnd=${pillarAgeEnd}`);
          break;
        } else {
          this.logger.log(`  - Pillar ${i}: ageStart=${pillar.ageStart}, ageEnd=${pillarAgeEnd}, currentAge=${currentAge} (no match)`);
        }
      }
    }
    
    // Additional fallback: find by year if age-based search didn't work
    // When time is unknown, ageStart is null for all pillars except Pillar 0
    // So we must use yearStart/yearEnd to find the current cycle
    if (!currentLuckPillar) {
      this.logger.log(`🔍 Searching by year (currentYear=${currentYear})...`);
      for (let i = 0; i < allLuckPillars.length; i++) {
        const pillar = allLuckPillars[i];
        // Skip Pillar 0 (Pre-Luck Era) - it has ageStart=0, not null
        // For time-unknown cases, pillars 1-11 have ageStart=null but yearStart/yearEnd are populated
        if (i === 0 && pillar.ageStart === 0) {
          this.logger.log(`  - Skipping Pillar 0 (Pre-Luck Era)`);
          continue;
        }
        // Check if yearStart and yearEnd are valid (not null)
        if (pillar.yearStart !== null && pillar.yearEnd !== null) {
          if (
            pillar.yearStart <= currentYear &&
            currentYear <= pillar.yearEnd
          ) {
            currentLuckPillar = pillar;
            currentIndex = i;
            this.logger.log(`✅ Found current pillar via year range: index ${i}, yearStart=${pillar.yearStart}, yearEnd=${pillar.yearEnd}`);
            break;
          } else {
            this.logger.log(`  - Pillar ${i}: yearStart=${pillar.yearStart}, yearEnd=${pillar.yearEnd}, currentYear=${currentYear} (no match)`);
          }
        } else {
          this.logger.log(`  - Skipping Pillar ${i} (yearStart or yearEnd is null)`);
        }
      }
    }

    // If no current found, use first future pillar or last past pillar
    if (!currentLuckPillar) {
      this.logger.log(`🔍 No pillar found via age/year, checking if before first pillar...`);
      // Check if we're before first luck pillar
      if (allLuckPillars[0] && currentYear < allLuckPillars[0].yearStart) {
        // Pre-Luck Era
        const currentTheme = getLuckCycleTheme({
          tenGod: null,
          stemElement: 'WOOD' as ElementType,
          branchLifeCycle: null,
          favorableElements: userContext.favorableElements || {
            primary: [],
            secondary: [],
            unfavorable: [],
          },
          natalPatterns: userContext.natalPatterns,
          chartStrength: userContext.chartStrength,
        });

        const nextPillar = allLuckPillars[0];
        const nextTenGod =
          nextPillar.heavenlyStemTenGod?.name || null;
        
        // Calculate ageEnd (luck pillars are 10 years)
        const nextAgeEnd = nextPillar.ageStart + 9; // ageStart to ageStart+9 = 10 years
        
        // Get life cycle from branch if available
        const nextLifeCycle: string | null = 
          (nextPillar.earthlyBranch as any)?.lifeCycle || null;
        
        const nextTheme = getLuckCycleTheme({
          tenGod: nextTenGod,
          stemElement: nextPillar.heavenlyStem?.elementType || 'WOOD',
          branchLifeCycle: nextLifeCycle,
          favorableElements: userContext.favorableElements || {
            primary: [],
            secondary: [],
            unfavorable: [],
          },
          natalPatterns: userContext.natalPatterns,
          chartStrength: userContext.chartStrength,
        });

        return {
          current: {
            emoji: currentTheme.emoji,
            title: currentTheme.title,
            description: currentTheme.description,
            technicalBasis: [
              `Pre-Luck Era: Major luck cycles begin at age ${nextPillar.ageStart}`,
              `Next cycle: ${nextPillar.heavenlyStem?.character || ''}${nextPillar.earthlyBranch?.character || ''} (${nextTenGod || 'None'})`,
              `Period: Age ${nextPillar.ageStart}-${nextAgeEnd} (${nextPillar.yearStart}-${nextPillar.yearEnd})`,
            ],
          },
          next: {
            emoji: nextTheme.emoji,
            title: nextTheme.title,
            description: nextTheme.description,
            technicalBasis: [
              `Luck Pillar: ${nextPillar.heavenlyStem?.character || ''}${nextPillar.earthlyBranch?.character || ''}`,
              `Ten God: ${nextTenGod || 'None'}`,
              `Element: ${nextPillar.heavenlyStem?.elementType || 'Unknown'}`,
              `Period: Age ${nextPillar.ageStart}-${nextAgeEnd} (${nextPillar.yearStart}-${nextPillar.yearEnd})`,
            ],
          },
        };
      }

      // Use last pillar if we're past all
      this.logger.log(`🔍 Using last pillar as fallback: index ${allLuckPillars.length - 1}`);
      currentLuckPillar = allLuckPillars[allLuckPillars.length - 1];
      currentIndex = allLuckPillars.length - 1;
      
      // Safety check: if last pillar is Pillar 0 (ageStart: null), find the actual last real cycle
      if (currentLuckPillar.ageStart === null || currentLuckPillar.ageStart === undefined) {
        this.logger.error(`❌ ERROR: Last pillar is Pillar 0 (Pre-Luck Era) but person is age ${currentAge}! Finding last real cycle...`);
        // Try to find the actual last real cycle
        for (let i = allLuckPillars.length - 1; i >= 0; i--) {
          if (allLuckPillars[i].ageStart !== null && allLuckPillars[i].ageStart !== undefined) {
            this.logger.log(`✅ Found last real cycle: index ${i}, ageStart=${allLuckPillars[i].ageStart}`);
            currentLuckPillar = allLuckPillars[i];
            currentIndex = i;
            break;
          }
        }
      }
    }
    
    // Final safety check: if we still have Pillar 0 for someone over age 10, force-correct it
    if (currentLuckPillar && (currentLuckPillar.ageStart === null || currentLuckPillar.ageStart === undefined) && currentAge > 10) {
      this.logger.error(`❌ ERROR: Selected Pillar 0 (Pre-Luck Era) for age ${currentAge}! Force-correcting...`);
      // Force find by age - should always work if person is past Pre-Luck Era
      for (let i = 1; i < allLuckPillars.length; i++) {
        const pillar = allLuckPillars[i];
        if (pillar.ageStart !== null && pillar.ageStart !== undefined) {
          const pillarAgeEnd = pillar.ageStart + 9;
          if (currentAge >= pillar.ageStart && currentAge <= pillarAgeEnd) {
            this.logger.log(`✅ Force-corrected to pillar: index ${i}, ageStart=${pillar.ageStart}, ageEnd=${pillarAgeEnd}`);
            currentLuckPillar = pillar;
            currentIndex = i;
            break;
          }
        }
      }
    }

    // Get next luck pillar
    const nextLuckPillar =
      currentIndex < allLuckPillars.length - 1
        ? allLuckPillars[currentIndex + 1]
        : null;

    // Calculate themes
    // Use Ten God from daily analysis (more accurate - calculated relative to Day Master)
    // If daily analysis doesn't have it, calculate using library's method (same as getAnalysisForDate does)
    let currentTenGod = currentTenGodFromDaily;
    
    if (!currentTenGod) {
      // Library calculates Ten God like this: analysisCalculator.calculateTenGod(dayMasterStem, luckPillarStem)
      // Since getCurrentLuckPillar returns null, we'll calculate it ourselves using the same inputs
      const dayMasterStem = baseAnalysis.detailedPillars?.day?.heavenlyStem;
      const luckPillarStem = currentLuckPillar.heavenlyStem;
      
      if (dayMasterStem && luckPillarStem) {
        // Try to access calculator's analysisCalculator (library's internal method)
        // If accessible, use it; otherwise we'll need to debug why getCurrentLuckPillar fails
        try {
          const analysisCalculator = (calculator as any).analysisCalculator;
          if (analysisCalculator && typeof analysisCalculator.calculateTenGod === 'function') {
            const tenGodResult = analysisCalculator.calculateTenGod(dayMasterStem, luckPillarStem);
            currentTenGod = tenGodResult?.name || null;
            
            // Handle case where Day Master and luck pillar stem are the same
            // Library returns null for same stem (treats as "self"), but for luck pillars
            // it should still be "Companion" (Bi Jian or Jie Cai based on Yin/Yang)
            if (!currentTenGod && dayMasterStem.value === luckPillarStem.value) {
              // Same stem = Companion relationship
              // Same Yin/Yang = Bi Jian (Friend), Different = Jie Cai (Rob Wealth)
              const sameYinYang = dayMasterStem.yinYang === luckPillarStem.yinYang;
              currentTenGod = sameYinYang ? 'Bi Jian' : 'Jie Cai';
              this.logger.log(`✅ Calculated Ten God (Companion): ${currentTenGod} for same stem ${dayMasterStem.character}`);
            } else if (!currentTenGod) {
              this.logger.warn(`Ten God calculation returned null for Day Master ${dayMasterStem.character} (${dayMasterStem.elementType}) and Luck Pillar ${luckPillarStem.character} (${luckPillarStem.elementType})`);
            } else {
              this.logger.log(`✅ Calculated Ten God: ${currentTenGod} for Day Master ${dayMasterStem.character} and Luck Pillar ${luckPillarStem.character}`);
            }
          } else {
            this.logger.warn(`analysisCalculator.calculateTenGod is not accessible`);
          }
        } catch (error) {
          this.logger.warn(`Could not access calculator.analysisCalculator: ${error}`);
        }
      } else {
        this.logger.warn(`Missing Day Master or Luck Pillar stem: dayMasterStem=${!!dayMasterStem}, luckPillarStem=${!!luckPillarStem}`);
      }
      
      // Final fallback to luck pillar's heavenlyStemTenGod (if library populated it)
      if (!currentTenGod) {
        currentTenGod = currentLuckPillar.heavenlyStemTenGod?.name || null;
        if (currentTenGod) {
          this.logger.log(`Using Ten God from luck pillar: ${currentTenGod}`);
        }
      }
    } else {
      this.logger.log(`Using Ten God from daily analysis: ${currentTenGod}`);
    }
    
    // Special handling for Pillar 0 (Pre-Luck Era)
    // Pillar 0 doesn't last 10 years - it lasts until Pillar 1 starts (typically around age 8)
    const isPreLuckEra = currentIndex === 0 && currentLuckPillar.ageStart === 0;
    let currentAgeEnd: number;
    let cycleEndDate: Date;
    
    if (isPreLuckEra) {
      // Pre-Luck Era ends when Pillar 1 starts
      // Find Pillar 1 to get its start age
      const nextPillar = allLuckPillars[1];
      if (nextPillar && (nextPillar.ageStart !== null && nextPillar.ageStart !== undefined)) {
        // Pillar 0 ends when Pillar 1 starts (at age nextPillar.ageStart)
        currentAgeEnd = nextPillar.ageStart - 1;
        cycleEndDate = addYears(birthDateTime, nextPillar.ageStart);
        this.logger.log(`📅 Pre-Luck Era: ends at age ${nextPillar.ageStart} (when Pillar 1 starts)`);
      } else {
        // Fallback: if Pillar 1 doesn't have ageStart, estimate it as age 8
        const estimatedPillar1StartAge = 8;
        currentAgeEnd = estimatedPillar1StartAge - 1;
        cycleEndDate = addYears(birthDateTime, estimatedPillar1StartAge);
        this.logger.log(`📅 Pre-Luck Era: using estimated end at age ${estimatedPillar1StartAge}`);
      }
    } else {
      // Regular luck pillars are 10 years
      currentAgeEnd = currentLuckPillar.ageStart + 9; // ageStart to ageStart+9 = 10 years
      // Cycle ends: birthDateTime + (ageEnd + 1) years (when person turns ageEnd + 1, i.e., starts next cycle)
      cycleEndDate = addYears(birthDateTime, currentAgeEnd + 1);
    }
    
    // Get life cycle from branch if available
    // Note: lifeCycle may be on the branch object or need to be calculated
    const currentLifeCycle: string | null = 
      (currentLuckPillar.earthlyBranch as any)?.lifeCycle || null;
    
    // Use element from daily analysis if available (more accurate), otherwise fallback to luck pillar
    // Priority: daily analysis > calculated luck pillar > array luck pillar
    const currentStemElement = (currentStemElementFromDaily || 
      currentLuckPillarFromCalc?.heavenlyStem?.elementType ||
      currentLuckPillar.heavenlyStem?.elementType || 
      'WOOD') as ElementType;
    
    // Final Ten God - calculated using library's method if not available from daily analysis
    // For Pre-Luck Era, Ten God is typically null (no luck pillar yet)
    const finalTenGod = isPreLuckEra ? null : currentTenGod;
    
    // Debug: If Ten God is null, check why (should not be null for luck pillars, but OK for Pre-Luck Era)
    if (!finalTenGod && currentLuckPillar && !isPreLuckEra) {
      const dayMasterStem = baseAnalysis.detailedPillars?.day?.heavenlyStem;
      const luckPillarStem = currentLuckPillar.heavenlyStem;
      this.logger.warn(`⚠️ Ten God is null! Day Master: ${dayMasterStem?.character || 'null'} (value: ${dayMasterStem?.value || 'null'}), Luck Pillar: ${luckPillarStem?.character || 'null'} (value: ${luckPillarStem?.value || 'null'})`);
      this.logger.warn(`  - Stems are same value: ${dayMasterStem?.value === luckPillarStem?.value} (library returns null if same)`);
      this.logger.warn(`  - This should be "Companion" (Bi Jian/Jie Cai) if same element but different stems`);
    }
    
    const currentTheme = getLuckCycleTheme({
      tenGod: finalTenGod,
      stemElement: currentStemElement,
      branchLifeCycle: currentLifeCycle,
      favorableElements: userContext.favorableElements || {
        primary: [],
        secondary: [],
        unfavorable: [],
      },
      natalPatterns: userContext.natalPatterns,
      chartStrength: userContext.chartStrength,
    });

    // Calculate precise remaining time for current cycle
    // For Pre-Luck Era: ends when Pillar 1 starts
    // For regular cycles: ends at (ageEnd + 1) birthday
    const cycleStartDate = addYears(birthDateTime, currentLuckPillar.ageStart);
    
    // Debug: Log cycle timing (especially for time-unknown cases)
    if (!isTimeKnown) {
      this.logger.log(`🔍 Cycle Timing Debug (time unknown):`);
      this.logger.log(`  - Birth date: ${birthDateTime.toISOString()}`);
      this.logger.log(`  - Current age: ${currentAge}`);
      this.logger.log(`  - Cycle age range: ${currentLuckPillar.ageStart}-${currentAgeEnd}`);
      this.logger.log(`  - Cycle start date: ${cycleStartDate.toISOString()}`);
      this.logger.log(`  - Cycle end date: ${cycleEndDate.toISOString()}`);
      this.logger.log(`  - Now date: ${nowDate.toISOString()}`);
      this.logger.log(`  - Time until end: ${cycleEndDate.getTime() - nowDate.getTime()}ms`);
    }
    
    // Calculate precise time difference (preserves hours/minutes/seconds)
    let remainingTime = this.calculatePreciseTimeRemaining(nowDate, cycleEndDate);
    
    // Safety check: remaining time should never exceed 10 years for a 10-year cycle
    // If it does, it means we're not actually in the cycle yet (detection issue)
    // Cap it at 10 years max to prevent showing invalid data
    if (remainingTime.years > 10 || (remainingTime.years === 10 && (remainingTime.months > 0 || remainingTime.days > 0 || remainingTime.hours > 0))) {
      // If remaining time exceeds 10 years, we're likely before the cycle starts
      // This shouldn't happen if currentLuckPillar detection is correct, but cap it
      remainingTime = { years: 10, months: 0, days: 0, hours: 0, minutes: 0 };
    }

    // Build current technical basis
    const currentTechnicalBasis = [
      `Luck Pillar: ${currentLuckPillar.heavenlyStem?.character || ''}${currentLuckPillar.earthlyBranch?.character || ''}`,
      `Ten God: ${currentTenGod || 'None'}`,
      `Element: ${currentStemElement}`,
      `Period: Age ${currentLuckPillar.ageStart}-${currentAgeEnd} (${currentLuckPillar.yearStart}-${currentLuckPillar.yearEnd})`,
    ];

    // Add element favorability note
    const currentElementFavorability = this.getElementFavorabilityNote(
      currentStemElement,
      userContext.favorableElements,
    );
    if (currentElementFavorability) {
      currentTechnicalBasis.push(currentElementFavorability);
    }

    // Format expireAt in user's current timezone for clarity
    // This is when the current cycle ends, displayed in the user's current timezone
    const expireAt = formatInTimeZone(
      cycleEndDate,
      currentTimezone,
      "yyyy-MM-dd'T'HH:mm:ss",
    );

    const result: {
      current: {
        emoji: string;
        title: string;
        description: string;
        remainingTime: {
          years: number;
          months: number;
          days: number;
          hours: number;
          minutes: number;
        };
        expireAt: string; // ISO string in user's current timezone
        technicalBasis: string[];
      };
      next: {
        emoji: string;
        title: string;
        description: string;
        technicalBasis: string[];
      } | null;
    } = {
      current: {
        emoji: currentTheme.emoji,
        title: currentTheme.title,
        description: currentTheme.description,
        remainingTime,
        expireAt,
        technicalBasis: currentTechnicalBasis,
      },
      next: null,
    };

    // Add next luck cycle if available
    if (nextLuckPillar) {
      // Calculate Ten God for next pillar (same method as current pillar)
      let nextTenGod = nextLuckPillar.heavenlyStemTenGod?.name || null;
      
      // If Ten God is not available from pillar, calculate it using library's method
      if (!nextTenGod) {
        const dayMasterStem = baseAnalysis.detailedPillars?.day?.heavenlyStem;
        const nextLuckPillarStem = nextLuckPillar.heavenlyStem;
        
        if (dayMasterStem && nextLuckPillarStem) {
          try {
            const analysisCalculator = (calculator as any).analysisCalculator;
            if (analysisCalculator && typeof analysisCalculator.calculateTenGod === 'function') {
              const tenGodResult = analysisCalculator.calculateTenGod(dayMasterStem, nextLuckPillarStem);
              nextTenGod = tenGodResult?.name || null;
              
              // Handle case where Day Master and next luck pillar stem are the same
              if (!nextTenGod && dayMasterStem.value === nextLuckPillarStem.value) {
                const sameYinYang = dayMasterStem.yinYang === nextLuckPillarStem.yinYang;
                nextTenGod = sameYinYang ? 'Bi Jian' : 'Jie Cai';
                this.logger.log(`✅ Calculated Ten God (Companion) for next pillar: ${nextTenGod} for same stem ${dayMasterStem.character}`);
              } else if (nextTenGod) {
                this.logger.log(`✅ Calculated Ten God for next pillar: ${nextTenGod} for Day Master ${dayMasterStem.character} and Next Luck Pillar ${nextLuckPillarStem.character}`);
              }
            }
          } catch (error) {
            this.logger.warn(`Could not calculate Ten God for next pillar: ${error}`);
          }
        }
      }
      
      const nextAgeEnd = nextLuckPillar.ageStart + 9; // 10-year period
      const nextLifeCycle: string | null = 
        (nextLuckPillar.earthlyBranch as any)?.lifeCycle || null;
      
      const nextTheme = getLuckCycleTheme({
        tenGod: nextTenGod,
        stemElement: nextLuckPillar.heavenlyStem?.elementType || 'WOOD',
        branchLifeCycle: nextLifeCycle,
        favorableElements: userContext.favorableElements || {
          primary: [],
          secondary: [],
          unfavorable: [],
        },
        natalPatterns: userContext.natalPatterns,
        chartStrength: userContext.chartStrength,
      });

      const nextTechnicalBasis = [
        `Luck Pillar: ${nextLuckPillar.heavenlyStem?.character || ''}${nextLuckPillar.earthlyBranch?.character || ''}`,
        `Ten God: ${nextTenGod || 'None'}`,
        `Element: ${nextLuckPillar.heavenlyStem?.elementType || 'Unknown'}`,
        `Period: Age ${nextLuckPillar.ageStart}-${nextAgeEnd} (${nextLuckPillar.yearStart}-${nextLuckPillar.yearEnd})`,
      ];

      const nextElementFavorability = this.getElementFavorabilityNote(
        nextLuckPillar.heavenlyStem?.elementType || 'WOOD',
        userContext.favorableElements,
      );
      if (nextElementFavorability) {
        nextTechnicalBasis.push(nextElementFavorability);
      }

      result.next = {
        emoji: nextTheme.emoji,
        title: nextTheme.title,
        description: nextTheme.description,
        technicalBasis: nextTechnicalBasis,
      };
    }

    return result;
  }

  /**
   * Calculate precise time remaining between two dates
   * Returns: { years, months, days, hours, minutes }
   * 
   * Uses iterative subtraction to handle month/year boundaries correctly
   */
  private calculatePreciseTimeRemaining(
    fromDate: Date,
    toDate: Date,
  ): { years: number; months: number; days: number; hours: number; minutes: number } {
    // If toDate is in the past, return zeros
    if (toDate <= fromDate) {
      return { years: 0, months: 0, days: 0, hours: 0, minutes: 0 };
    }

    let tempDate = new Date(fromDate);
    let years = 0;
    let months = 0;
    let days = 0;
    let hours = 0;
    let minutes = 0;

    // Calculate years (iteratively add years until we exceed toDate)
    while (true) {
      const nextYear = addYears(tempDate, 1);
      if (nextYear > toDate) break;
      tempDate = nextYear;
      years++;
    }

    // Calculate months (iteratively add months until we exceed toDate)
    while (true) {
      const nextMonth = new Date(tempDate);
      nextMonth.setMonth(nextMonth.getMonth() + 1);
      if (nextMonth > toDate) break;
      tempDate = nextMonth;
      months++;
    }

    // Calculate days (iteratively add days until we exceed toDate)
    while (true) {
      const nextDay = addDays(tempDate, 1);
      if (nextDay > toDate) break;
      tempDate = nextDay;
      days++;
    }

    // Calculate remaining hours and minutes
    const remainingMs = toDate.getTime() - tempDate.getTime();
    hours = Math.floor(remainingMs / (1000 * 60 * 60));
    const remainingMsAfterHours = remainingMs - (hours * 1000 * 60 * 60);
    minutes = Math.floor(remainingMsAfterHours / (1000 * 60));

    return { years, months, days, hours, minutes };
  }

  /**
   * Helper: Get element favorability note for technical basis
   */
  private getElementFavorabilityNote(
    element: ElementType,
    favorableElements: {
      primary: ElementType[];
      secondary: ElementType[];
      unfavorable: ElementType[];
    } | null,
  ): string | null {
    if (!favorableElements) return null;

    if (
      favorableElements.primary.includes(element) ||
      favorableElements.secondary.includes(element)
    ) {
      return `Element Favorability: Favorable (supports Day Master)`;
    }
    if (favorableElements.unfavorable.includes(element)) {
      return `Element Favorability: Unfavorable (weakens Day Master)`;
    }
    return null;
  }

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
  generateIdentity(userContext: UserContext) {
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
  getWhoYouAreContent(
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

    // Calculate rarity dynamically (same logic as getBasicProfile)
    const elementDistribution = this.calculateElementDistribution(userContext);
    const rarity = this.calculateRarity(
      typeCode,
      userContext,
      elementDistribution,
    );
    const rarityText = `1 in ${rarity.overall.oneIn.toLocaleString()}`;

    // Replace {rarity} placeholder in paragraphs with actual calculated rarity
    const paragraphs = template.paragraphs.map((para) =>
      para.replace('{rarity}', rarityText),
    );

    return {
      paragraphs,
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
   * Format element distribution for compatibility report response
   */
  private formatElementDistributionForCompatibility(
    elementDist: ReturnType<typeof this.calculateElementDistribution>,
  ) {
    const ELEMENT_EMOJI: Record<string, string> = {
      WOOD: '🌳',
      FIRE: '🔥',
      EARTH: '⛰️',
      METAL: '⚔️',
      WATER: '💧',
    };

    const elements = [
      {
        element: 'WOOD',
        count: elementDist.wood,
        percentage: elementDist.percentages.wood,
        emoji: ELEMENT_EMOJI.WOOD,
      },
      {
        element: 'FIRE',
        count: elementDist.fire,
        percentage: elementDist.percentages.fire,
        emoji: ELEMENT_EMOJI.FIRE,
      },
      {
        element: 'EARTH',
        count: elementDist.earth,
        percentage: elementDist.percentages.earth,
        emoji: ELEMENT_EMOJI.EARTH,
      },
      {
        element: 'METAL',
        count: elementDist.metal,
        percentage: elementDist.percentages.metal,
        emoji: ELEMENT_EMOJI.METAL,
      },
      {
        element: 'WATER',
        count: elementDist.water,
        percentage: elementDist.percentages.water,
        emoji: ELEMENT_EMOJI.WATER,
      },
    ].filter((e) => e.count > 0); // Only include elements that exist

    return {
      elements,
      dominant: elementDist.dominant,
      missing: elementDist.missing,
    };
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
        model: geminiClient('gemini-2.5-flash'),
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
        model: geminiClient('gemini-2.5-flash'),
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
   * Generate pairing explanation - explains why this pairing is called this name
   * Similar to generateChartMeaning but for compatibility pairs
   * Explains elemental distribution and interaction in plain language
   */
  private generatePairingExplanation(
    pairingTitle: { name: string; subtitle: string },
    identity1: ReturnType<typeof this.generateIdentity>,
    identity2: ReturnType<typeof this.generateIdentity>,
    elementDist1: ReturnType<typeof this.calculateElementDistribution>,
    elementDist2: ReturnType<typeof this.calculateElementDistribution>,
    elementInteraction: ReturnType<typeof this.calculateElementInteraction>,
  ): {
    summary: string;
    implications: string[];
    soWhat: string;
  } {
    const person1Dominant = elementDist1.dominant[0] || 'Balanced';
    const person2Dominant = elementDist2.dominant[0] || 'Balanced';
    const person1Missing = elementDist1.missing || [];
    const person2Missing = elementDist2.missing || [];

    // Build summary
    const summary = `This pairing is called "${pairingTitle.name}" because ${elementInteraction.interactionType === 'Controlling' ? `${identity2.element} (you) controls ${identity1.element} (them), creating a dynamic where intensity refines structure` : elementInteraction.interactionType === 'Generative' ? `${identity1.element} (them) naturally supports ${identity2.element} (you), creating flowing growth` : elementInteraction.interactionType === 'Harmonious' ? `both share ${identity1.element} energy, creating natural resonance` : `your elemental energies interact in unique ways`}.`;

    // Build implications
    const implications: string[] = [];

    // Element interaction implication
    implications.push(elementInteraction.description);

    // Shared dominant element (if both have same dominant)
    if (person1Dominant === person2Dominant && person1Dominant !== 'Balanced') {
      implications.push(`Both of you have ${person1Dominant} as your dominant element, which means you share a fundamental grounding in ${person1Dominant.toLowerCase()}-like qualities—${person1Dominant === 'EARTH' ? 'stability, practicality, and tangible results' : person1Dominant === 'FIRE' ? 'passion, intensity, and transformation' : person1Dominant === 'METAL' ? 'precision, structure, and refinement' : person1Dominant === 'WATER' ? 'adaptability, depth, and flow' : 'growth, expansion, and vision'}.`);
    }

    // Missing elements (if both missing same)
    const sharedMissing = person1Missing.filter((e) => person2Missing.includes(e));
    if (sharedMissing.length > 0) {
      const missingList = sharedMissing.join(' and ');
      implications.push(`Neither of you has ${missingList} in your charts, which means you both benefit from bringing ${missingList.toLowerCase()}-like qualities into your relationship.`);
    }

    // Build "so what" conclusion
    const soWhat = `This is why you're "${pairingTitle.name}"—your elemental charts show ${person1Dominant === person2Dominant && person1Dominant !== 'Balanced' ? `shared ${person1Dominant.toLowerCase()} dominance` : `${identity1.element} meets ${identity2.element} in ${elementInteraction.interactionType.toLowerCase()} energy`}, and ${elementInteraction.description.toLowerCase()}.`;

    return {
      summary,
      implications,
      soWhat,
    };
  }

  /**
   * Generate compatibility analysis between two people
   */
  /**
   * Build comprehensive BaZi context string for LLM compatibility analysis
   */
  private buildBaziContextForLLM(
    userContext: UserContext,
    identity: ReturnType<typeof this.generateIdentity>,
    personLabel: string, // "Person1" or "Person2"
  ): string {
    const { natalStructure, specialStars, natalPatterns } = userContext;
    const elementDist = this.calculateElementDistribution(userContext);

    // Get Day Master explanation for traditional BaZi context
    const dayMasterChar = userContext.natalStructure.personal.stem;
    const dayMasterInfo = DAY_MASTER_EXPLANATIONS[dayMasterChar];

    // Build comprehensive context
    let context = `\n=== ${personLabel} BaZi Chart Data ===\n`;
    context += `Day Master: ${identity.element}-${identity.polarity} (${identity.code}) - ${identity.title}\n`;
    if (dayMasterInfo) {
      context += `Day Master Nature: ${dayMasterInfo.explanation}\n`;
      context += `Core Trait: ${identity.coreTrait}\n`;
      context += `Behavioral Style: ${identity.behavior}\n`;
    }
    context += `Year Pillar: ${natalStructure.social.stem}${natalStructure.social.branch} (${natalStructure.social.element})\n`;
    context += `Month Pillar: ${natalStructure.career.stem}${natalStructure.career.branch} (${natalStructure.career.element})\n`;
    context += `Day Pillar: ${natalStructure.personal.stem}${natalStructure.personal.branch} (${natalStructure.personal.element})\n`;
    if (natalStructure.innovation) {
      context += `Hour Pillar: ${natalStructure.innovation.stem}${natalStructure.innovation.branch} (${natalStructure.innovation.element})\n`;
    }

    context += `\nElement Distribution:\n`;
    context += `- Wood: ${elementDist.wood} (${elementDist.percentages.wood}%)\n`;
    context += `- Fire: ${elementDist.fire} (${elementDist.percentages.fire}%)\n`;
    context += `- Earth: ${elementDist.earth} (${elementDist.percentages.earth}%)\n`;
    context += `- Metal: ${elementDist.metal} (${elementDist.percentages.metal}%)\n`;
    context += `- Water: ${elementDist.water} (${elementDist.percentages.water}%)\n`;
    context += `Dominant: ${elementDist.dominant.join(', ')}\n`;
    if (elementDist.missing.length > 0) {
      context += `Missing: ${elementDist.missing.join(', ')}\n`;
    }

    // Add Ten Gods if available (from natal structure)
    // Note: Ten Gods are calculated from pillar interactions, not stored directly in UserContext
    // We can add this later if needed for compatibility analysis

    // Add special stars
    if (specialStars) {
      context += `\nSpecial Stars:\n`;
      if (specialStars.intelligence) {
        context += `- Intelligence Star (文昌): ${specialStars.intelligence}\n`;
      }
      if (specialStars.peachBlossom) {
        context += `- Peach Blossom (桃花): ${specialStars.peachBlossom}\n`;
      }
      if (specialStars.skyHorse) {
        context += `- Sky Horse (驿马): ${specialStars.skyHorse}\n`;
      }
      if (specialStars.nobleman && specialStars.nobleman.length > 0) {
        context += `- Nobleman (天乙贵人): ${specialStars.nobleman.join(', ')}\n`;
      }
    }

    // Add patterns
    if (natalPatterns && natalPatterns.length > 0) {
      context += `\nSpecial Patterns:\n`;
      natalPatterns.forEach((pattern) => {
        context += `- ${pattern.name}: ${pattern.description}\n`;
      });
    }

    return context;
  }

  /**
   * Generate compatibility analysis for a specific category using LLM
   */
  private async generateCategoryCompatibility(
    category: 'romance' | 'work' | 'lifestyle' | 'communication',
    person1Context: UserContext,
    person1Identity: ReturnType<typeof this.generateIdentity>,
    person2Context: UserContext,
    person2Identity: ReturnType<typeof this.generateIdentity>,
    person1Gender: 'male' | 'female',
    person2Gender: 'male' | 'female',
    person1BirthDate: Date,
    person2BirthDate: Date,
  ): Promise<{
    category: string;
    emoji: string;
    title: string;
    subCategories: Array<{
      title: string;
      person1Analysis: string;
      person2Analysis: string;
      result: {
        score: 'Highly Compatible' | 'Compatible' | 'Neutral' | 'Challenging' | 'Highly Challenging';
        match: string;
        analysis: string;
        actionableTip?: string;
      };
    }>;
  }> {
    const categoryConfig = {
      romance: {
        emoji: '💕',
        title: 'Romance',
        subCategories: [
          'Emotional Expression',
          'Intimacy & Connection',
          'Conflict Resolution',
          'Long-term Vision',
        ],
      },
      work: {
        emoji: '💼',
        title: 'Work',
        subCategories: [
          'Communication Style',
          'Decision Making',
          'Work Pace & Energy',
          'Collaboration Approach',
        ],
      },
      lifestyle: {
        emoji: '🏠',
        title: 'Lifestyle',
        subCategories: [
          'Daily Routines',
          'Social Preferences',
          'Financial Values',
          'Life Priorities',
        ],
      },
      communication: {
        emoji: '💬',
        title: 'Communication',
        subCategories: [
          'Communication Style',
          'Conflict Approach',
          'Support & Needs',
          'Shared Values',
        ],
      },
    };

    const config = categoryConfig[category];
    const person1Pronoun = person1Gender === 'male' ? 'he' : person1Gender === 'female' ? 'she' : 'they';
    const person1Possessive = person1Gender === 'male' ? 'his' : person1Gender === 'female' ? 'her' : 'their';

    // Calculate ages for life stage context
    const now = new Date();
    const person1Age = Math.floor((now.getTime() - person1BirthDate.getTime()) / (1000 * 60 * 60 * 24 * 365.25));
    const person2Age = Math.floor((now.getTime() - person2BirthDate.getTime()) / (1000 * 60 * 60 * 24 * 365.25));
    
    // Determine life stage
    const getLifeStage = (age: number): string => {
      if (age < 25) return 'young adult';
      if (age < 35) return 'early career';
      if (age < 50) return 'mid-career';
      if (age < 65) return 'established';
      return 'mature';
    };
    const person1LifeStage = getLifeStage(person1Age);
    const person2LifeStage = getLifeStage(person2Age);

    // Calculate element interaction for context
    const elementInteraction = this.calculateElementInteraction(
      person1Identity.element as ElementType,
      person2Identity.element as ElementType,
    );

    // Get "Who You Are" content for both persons - this ensures consistency with personal reports
    const person1WhoYouAre = this.getWhoYouAreContent(person1Identity.code, person1Context);
    const person2WhoYouAre = this.getWhoYouAreContent(person2Identity.code, person2Context);

    const schema = z.object({
      subCategories: z.array(
        z.object({
          title: z.string(),
          person1Analysis: z.string().describe(`How Person1 approaches this sub-category. Use "${person1Pronoun}" or "${person1Possessive}" pronouns.`),
          person2Analysis: z.string().describe(`How Person2 approaches this sub-category. Use "you" or "your" pronouns (Person2 is the requestor).`),
          result: z.object({
            score: z.enum(['Highly Compatible', 'Compatible', 'Neutral', 'Challenging', 'Highly Challenging']),
            match: z.string().describe('Brief match description (e.g., "Strong Match", "Requires Attention")'),
            analysis: z.string().describe('2-3 sentences explaining the compatibility level and why'),
            actionableTip: z.string().optional().describe('Optional: specific tip for this sub-category'),
          }),
        }),
      ),
    });

    const prompt = `You are a relationship compatibility expert. Analyze how two people connect in the ${config.title} category. Write in simple, direct language that anyone can understand - NO technical terms or jargon.

**Person1 (${person1Identity.title}):**
Age: ${person1Age} (${person1LifeStage} stage)
Gender: ${person1Gender}
${person1WhoYouAre.paragraphs.join('\n\n')}

**Person2 (${person2Identity.title} - this is the requestor reading the report):**
Age: ${person2Age} (${person2LifeStage} stage)
Gender: ${person2Gender}
${person2WhoYouAre.paragraphs.join('\n\n')}

**IMPORTANT - Consider Age & Life Stage (but DO NOT mention ages in output):**
- The personality traits described above are core tendencies, but how they manifest changes with age and life experience
- A 20-year-old and a 50-year-old with the same traits will express them differently
- Consider their life stage when describing behaviors (e.g., a young adult might be more idealistic, while someone established might be more pragmatic)
- **CRITICAL: DO NOT mention ages, life stages, or years in your output** - use age context only to inform how traits manifest, never state it directly
- **CRITICAL: Do NOT copy phrases verbatim from the descriptions above** - extract the MEANING and CORE TRAITS, then express them in YOUR OWN WORDS
- If you find yourself using the exact same phrases from the descriptions, stop and rephrase completely
- Use the descriptions as a reference for personality traits, not as text to quote or copy

**CRITICAL: Scoring Consistency Rules**
Use these EXACT criteria for each score level. Be consistent - the same chart data should ALWAYS produce the same score:

- **Highly Compatible (5)**: Natural synergy - you work well together with minimal effort. Your personalities complement each other perfectly.

- **Compatible (4)**: Good fit overall - you connect well but may need small adjustments in some areas. Generally positive dynamic.

- **Neutral (3)**: Mixed bag - some things work, some don't. Compatibility depends on context and how much effort you both put in.

- **Challenging (2)**: Significant differences - you'll need to work hard and compromise to make this work. Not impossible, but requires effort.

- **Highly Challenging (1)**: Fundamental differences - your personalities clash in ways that require constant attention and effort to manage.

**Instructions:**
1. Analyze each of the 4 sub-categories: ${config.subCategories.join(', ')}

2. For each sub-category, maintain this structure (required for UI):
   - **Person1Analysis**: Describe Person1's approach using "${person1Pronoun}" or "${person1Possessive}" pronouns
   - **Person2Analysis**: Describe Person2's approach using "you" or "your" pronouns (Person2 is the requestor)
   - **Result**: Score, match description, analysis (2-3 sentences), and optional actionable tip

3. **CRITICAL - Use the "Who You Are" descriptions above to create SPECIFIC, CONCRETE analyses:**
   - Reference specific behaviors and examples from the descriptions (e.g., "stays late perfecting presentations", "doesn't do casual", "struggles to delegate")
   - Use concrete scenarios, not abstract traits (e.g., "She might rewrite a text three times" not "She values precision")
   - Show HOW their traits manifest differently, not just THAT they're different
   - Each sub-category should feel unique - avoid repeating the same phrases or patterns

4. **Vary your language** - Don't use "meticulous", "uncompromising quality", "intense focus" in every analysis. Use different words:
   - Instead of "meticulous": "detail-oriented", "thorough", "careful", "precise", "exacting"
   - Instead of "uncompromising quality": "high standards", "won't settle", "demands excellence", "refuses mediocrity"
   - Instead of "intense focus": "deep concentration", "laser attention", "all-in commitment", "zeroing in"

5. **Be concise and punchy** - Aim for 2-3 sentences per analysis, not paragraphs. Cut filler words.

6. Write in simple, direct language as if explaining to a friend - NO technical terms or jargon.

Return analysis for all 4 sub-categories.`;

    const result = await generateText({
      model: geminiClient('gemini-2.5-flash'),
      temperature: 0.6, // Balanced temperature for natural variation while maintaining consistency
      prompt,
      output: Output.object({ schema }),
    });

    return {
      category: category as 'romance' | 'work' | 'lifestyle' | 'communication',
      emoji: config.emoji,
      title: config.title,
      subCategories: result.output.subCategories,
    };
  }

  /**
   * Generate ALL compatibility content in a single comprehensive prompt
   * This ensures consistency across categories and prevents contradictions
   */
  private async generateAllCompatibilityContent(
    person1Context: UserContext,
    person1Identity: ReturnType<typeof this.generateIdentity>,
    person2Context: UserContext,
    person2Identity: ReturnType<typeof this.generateIdentity>,
    person1Gender: 'male' | 'female',
    person2Gender: 'male' | 'female',
    person1BirthDate: Date,
    person2BirthDate: Date,
    elementInteraction: ReturnType<typeof this.calculateElementInteraction>,
  ): Promise<{
    categories: Array<{
      category: string;
      emoji: string;
      title: string;
      subCategories: Array<{
        title: string;
        person1Analysis: string;
        person2Analysis: string;
        result: {
          score: 'Highly Compatible' | 'Compatible' | 'Neutral' | 'Challenging' | 'Highly Challenging';
          match: string;
          analysis: string;
          actionableTip?: string;
        };
      }>;
    }>;
    overview: string;
    conclusion: string;
  }> {
    const person1Pronoun = person1Gender === 'male' ? 'he' : person1Gender === 'female' ? 'she' : 'they';
    const person1Possessive = person1Gender === 'male' ? 'his' : person1Gender === 'female' ? 'her' : 'their';

    // Calculate ages for life stage context
    const now = new Date();
    const person1Age = Math.floor((now.getTime() - person1BirthDate.getTime()) / (1000 * 60 * 60 * 24 * 365.25));
    const person2Age = Math.floor((now.getTime() - person2BirthDate.getTime()) / (1000 * 60 * 60 * 24 * 365.25));
    
    // Determine life stage
    const getLifeStage = (age: number): string => {
      if (age < 25) return 'young adult';
      if (age < 35) return 'early career';
      if (age < 50) return 'mid-career';
      if (age < 65) return 'established';
      return 'mature';
    };
    const person1LifeStage = getLifeStage(person1Age);
    const person2LifeStage = getLifeStage(person2Age);

    // Get "Who You Are" content for both persons
    const person1WhoYouAre = this.getWhoYouAreContent(person1Identity.code, person1Context);
    const person2WhoYouAre = this.getWhoYouAreContent(person2Identity.code, person2Context);

    const schema = z.object({
      categories: z.array(
        z.object({
          category: z.enum(['romance', 'work', 'lifestyle', 'communication']),
          emoji: z.string(),
          title: z.string(),
          subCategories: z.array(
            z.object({
              title: z.string(),
              person1Analysis: z.string(),
              person2Analysis: z.string(),
              result: z.object({
                score: z.enum(['Highly Compatible', 'Compatible', 'Neutral', 'Challenging', 'Highly Challenging']),
                match: z.string(),
                analysis: z.string(),
                actionableTip: z.string().optional(),
              }),
            }),
          ),
        }),
      ),
      overview: z.string().describe('5-7 sentence overview synthesizing how they connect, written from Person2 perspective (use "you" for Person2, "they/he/she" for Person1)'),
      conclusion: z.string().describe('2-3 sentence conclusion summarizing the overall compatibility dynamic'),
    });

    const prompt = `You are a relationship compatibility expert. Analyze how two people connect across ALL areas of their relationship. Write in simple, direct language that anyone can understand - NO technical terms or jargon.

**Person1 (${person1Identity.title}):**
Age: ${person1Age} (${person1LifeStage} stage)
Gender: ${person1Gender}
${person1WhoYouAre.paragraphs.join('\n\n')}

**Person2 (${person2Identity.title} - this is the requestor reading the report):**
Age: ${person2Age} (${person2LifeStage} stage)
Gender: ${person2Gender}
${person2WhoYouAre.paragraphs.join('\n\n')}

**IMPORTANT - Consider Age & Life Stage (but DO NOT mention ages in output):**
- The personality traits described above are core tendencies, but how they manifest changes with age and life experience
- A 20-year-old and a 50-year-old with the same traits will express them differently
- Consider their life stage when describing behaviors
- **CRITICAL: DO NOT mention ages, life stages, or years in your output** - use age context only to inform how traits manifest
- **CRITICAL: Do NOT copy phrases verbatim from the descriptions above** - extract the MEANING and CORE TRAITS, then express them in YOUR OWN WORDS
- If you find yourself using the exact same phrases from the descriptions, stop and rephrase completely

**Element Interaction Reference (for scoring guidance only - DO NOT mention in output):**
- ${person1Identity.element} vs ${person2Identity.element}: ${elementInteraction.description}

**CRITICAL: Scoring Consistency Rules**
Use these EXACT criteria for each score level. Be consistent - the same chart data should ALWAYS produce the same score:

- **Highly Compatible (5)**: Natural synergy - you work well together with minimal effort. Your personalities complement each other perfectly.
- **Compatible (4)**: Good fit overall - you connect well but may need small adjustments in some areas. Generally positive dynamic.
- **Neutral (3)**: Mixed bag - some things work, some don't. Compatibility depends on context and how much effort you both put in.
- **Challenging (2)**: Significant differences - you'll need to work hard and compromise to make this work. Not impossible, but requires effort.
- **Highly Challenging (1)**: Fundamental differences - your personalities clash in ways that require constant attention and effort to manage.

**CRITICAL: Cross-Category Consistency**
- If the same behavior/trait appears in multiple categories (e.g., "conflict resolution" in Romance and "conflict approach" in Communication), ensure the scores are logically consistent
- The same underlying personality trait should be evaluated consistently across categories
- Don't score the same behavior as "Challenging" in one category and "Compatible" in another - be consistent

**Instructions:**
1. Analyze ALL 4 categories with their sub-categories:
   - **Romance**: Emotional Expression, Intimacy & Connection, Conflict Resolution, Long-term Vision
   - **Work**: Communication Style, Decision Making, Work Pace & Energy, Collaboration Approach
   - **Lifestyle**: Daily Routines, Social Preferences, Financial Values, Life Priorities
   - **Communication**: Communication Style, Conflict Approach, Support & Needs, Shared Values

2. For each sub-category:
   - **Person1Analysis**: Describe Person1's approach using "${person1Pronoun}" or "${person1Possessive}" pronouns
   - **Person2Analysis**: Describe Person2's approach using "you" or "your" pronouns (Person2 is the requestor)
   - **Result**: Score, match description, analysis (2-3 sentences), and optional actionable tip

3. **CRITICAL - Use the "Who You Are" descriptions above to create SPECIFIC, CONCRETE analyses:**
   - Reference specific behaviors and examples from the descriptions
   - Use concrete scenarios, not abstract traits
   - Show HOW their traits manifest differently, not just THAT they're different
   - Each sub-category should feel unique - avoid repeating the same phrases or patterns

4. **Vary your language** - Don't use "meticulous", "uncompromising quality", "intense focus" in every analysis. Use different words throughout.

5. **Be concise and punchy** - Aim for 2-3 sentences per analysis, not paragraphs.

6. **Generate overview** (5-7 sentences): Synthesize how they connect overall, written from Person2's perspective. Highlight key strengths and areas that need attention.

7. **Generate conclusion** (2-3 sentences): Summarize the overall compatibility dynamic in a memorable way.

8. Write in simple, direct language as if explaining to a friend - NO technical terms or jargon.

Return analysis for all 4 categories, overview, and conclusion.`;

    const result = await generateText({
      model: geminiClient('gemini-2.5-flash'),
      temperature: 0.6,
      prompt,
      output: Output.object({ schema }),
    });

    return {
      categories: result.output.categories,
      overview: result.output.overview,
      conclusion: result.output.conclusion,
    };
  }

  /**
   * Generate overall overview based on category results
   */
  private async generateCompatibilityOverviewFromCategories(
    person1Identity: ReturnType<typeof this.generateIdentity>,
    person2Identity: ReturnType<typeof this.generateIdentity>,
    categories: Array<{
      category: string;
      title: string;
      subCategories: Array<{
        title: string;
        result: { score: string; analysis: string };
      }>;
    }>,
  ): Promise<string> {
    // Build summary of category results
    let categorySummary = '';
    categories.forEach((cat) => {
      const scores = cat.subCategories.map((sc) => sc.result.score);
      const avgScore = scores.reduce((acc, score) => {
        const scoreValue = {
          'Highly Compatible': 5,
          'Compatible': 4,
          'Neutral': 3,
          'Challenging': 2,
          'Highly Challenging': 1,
        }[score] || 3;
        return acc + scoreValue;
      }, 0) / scores.length;

      categorySummary += `\n${cat.title}: Average score ${avgScore.toFixed(1)}/5\n`;
      cat.subCategories.forEach((sc) => {
        categorySummary += `  - ${sc.title}: ${sc.result.score} - ${sc.result.analysis}\n`;
      });
    });

    const prompt = `You are a relationship compatibility expert. Generate a 5-7 sentence overview synthesizing how ${person1Identity.title} and ${person2Identity.title} connect. Write in simple, direct language - NO technical terms or jargon.

**Category Results:**
${categorySummary}

**LANGUAGE REQUIREMENTS:**
- Write in plain, everyday language
- NO technical terms: Don't mention "Day Master", "Ten Gods", "elements", "BaZi", "pillars", "cycles", or any astrology jargon
- Be direct and simple: Focus on behaviors and personality traits
- Write as if explaining to a friend
- **CRITICAL: Use VARIED language** - Don't repeat the same phrases. Express concepts using different words throughout the overview

**Instructions:**
1. Write from Person2's perspective (use "you" for Person2, "they/he/she" for Person1)
2. Synthesize the overall dynamic based on the category results
3. Highlight key strengths and areas that need attention - in simple terms
4. Provide a balanced, psychology-focused overview
5. Avoid contradictions with the category analyses
6. Be specific about behaviors and personality traits, NOT technical concepts
7. Use simple, relatable language throughout

Generate a cohesive overview paragraph (5-7 sentences) in plain language.`;

    const { text } = await generateText({
      model: geminiClient('gemini-2.5-flash'),
      prompt,
    });

    return text;
  }

  /**
   * Swap person1 and person2 in a compatibility report
   */
  swapCompatibilityReportPersons(
    report: CompatibilityReport,
  ): CompatibilityReport {
    // Swap person1 and person2
    const swappedPerson1 = report.person2;
    const swappedPerson2 = report.person1;

    // Swap in pairing title
    const swappedPairingTitle = {
      name: report.pairingTitle.name,
      subtitle: report.pairingTitle.subtitle
        .replace(
          new RegExp(
            `${report.person1.identity.element}|${report.person2.identity.element}`,
            'g',
          ),
          (match) => {
            return match === report.person1.identity.element
              ? report.person2.identity.element
              : report.person1.identity.element;
          },
        ),
    };

    // Swap in chart display
    const swappedChartDisplay = {
      person1: report.chartDisplay.person2,
      person2: report.chartDisplay.person1,
      interaction: {
        ...report.chartDisplay.interaction,
        visual: report.chartDisplay.interaction.visual
          .split('→')
          .reverse()
          .join('→'),
      },
      fullCharts: {
        person1: report.chartDisplay.fullCharts.person2,
        person2: report.chartDisplay.fullCharts.person1,
      },
    };

    // Swap in technical basis
    const swappedTechnicalBasis = report.technicalBasis
      ? {
          ...report.technicalBasis,
          elementInteraction: {
            ...report.technicalBasis.elementInteraction,
            person1Element: report.technicalBasis.elementInteraction.person2Element,
            person2Element: report.technicalBasis.elementInteraction.person1Element,
          },
        }
      : undefined;

    // Update categories: swap person1Analysis and person2Analysis
    const swappedCategories = report.categories.map((cat) => ({
      ...cat,
      subCategories: cat.subCategories.map((sc) => ({
        ...sc,
        person1Analysis: sc.person2Analysis,
        person2Analysis: sc.person1Analysis,
      })),
    }));

    return {
      ...report,
      person1: swappedPerson1,
      person2: swappedPerson2,
      pairingTitle: swappedPairingTitle,
      chartDisplay: swappedChartDisplay,
      technicalBasis: swappedTechnicalBasis,
      categories: swappedCategories,
      // Note: overview, specialConnections, etc. may need pronoun swapping
      // For now, we'll regenerate overview if needed
    };
  }

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
    relationshipType?: 'romantic' | 'family' | 'friend' | 'colleague' | 'other',
  ): Promise<CompatibilityReport> {
    this.logger.log('=== getCompatibilityAnalysis called with NEW structure ===');
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
    const elementDist1 = this.calculateElementDistribution(userContext1);

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
    const elementDist2 = this.calculateElementDistribution(userContext2);

    // 2. Calculate element interaction
    const elementInteraction = this.calculateElementInteraction(
      identity1.element as ElementType,
      identity2.element as ElementType,
    );

    // 3. Calculate rarity
    const rarity = this.calculatePairingRarity(
      identity1.code,
      identity2.code,
      userContext1,
      userContext2,
    );

    // 4. Generate all categories + overview + conclusion in a single comprehensive prompt
    // This ensures consistency and prevents contradictions across categories
    this.logger.log('Starting comprehensive compatibility content generation (single prompt)...');
    const compatibilityContent = await this.generateAllCompatibilityContent(
      userContext1,
      identity1,
      userContext2,
      identity2,
      person1Data.gender,
      person2Data.gender,
      person1Data.birthDateTime,
      person2Data.birthDateTime,
      elementInteraction,
    ).catch((err) => {
      this.logger.error('Error generating comprehensive compatibility content:', err);
      throw err;
    });
    this.logger.log('Completed comprehensive compatibility content generation');

    const categories = compatibilityContent.categories;
    const overview = compatibilityContent.overview;
    const conclusion = compatibilityContent.conclusion;

    // 5. Generate pairing title (unique name for this compatibility)
    const pairingTitle = this.generatePairingTitle(
      identity1,
      identity2,
      elementInteraction,
    );

    // 6. Generate pairing explanation (why this pairing is called this name - similar to personal report chart explanation)
    const pairingExplanation = this.generatePairingExplanation(
      pairingTitle,
      identity1,
      identity2,
      elementDist1,
      elementDist2,
      elementInteraction,
    );

    // 7. Generate introduction text (explains the pairing's core dynamic)
    const introduction = await this.generateCompatibilityIntroduction(
      identity1,
      identity2,
      elementInteraction,
      null, // No score breakdown summary anymore
      0, // No overall score
    );

    // 8. Generate chart display (stacked cards with Day Masters + full charts)
    const chartDisplay = this.generateChartDisplay(
      userContext1,
      userContext2,
      identity1,
      identity2,
      elementInteraction,
    );

    // 9. Generate special connections
    const specialConnections = this.generateSpecialConnections(
      userContext1,
      userContext2,
      elementInteraction,
    );

    // 10. Build technical basis (hidden by default)
    const technicalBasis = this.buildTechnicalBasis(
      elementInteraction,
      null, // No baseScore anymore
      userContext1,
      userContext2,
    );

    return {
      pairingTitle,
      pairingExplanation,
      introduction,
      person1: {
        gender: person1Data.gender,
        identity: {
          code: identity1.code,
          title: identity1.title,
          element: identity1.element,
          polarity: identity1.polarity,
        },
        elementDistribution: this.formatElementDistributionForCompatibility(
          elementDist1,
        ),
      },
      person2: {
        gender: person2Data.gender,
        identity: {
          code: identity2.code,
          title: identity2.title,
          element: identity2.element,
          polarity: identity2.polarity,
        },
        elementDistribution: this.formatElementDistributionForCompatibility(
          elementDist2,
        ),
      },
      rarity,
      categories,
      overview,
      conclusion,
      chartDisplay,
      specialConnections,
      technicalBasis,
      generatedAt: new Date(),
      reportType: 'compatibility-teaser',
    } as CompatibilityReport;
  }

  /**
   * Calculate daily compatibility score by adjusting base score based on today's energy
   * Gets today's daily analysis for both people and adjusts compatibility accordingly
   */
  async calculateDailyCompatibility(
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
    baseScore: number,
    relationshipType: 'romantic' | 'family' | 'friend' | 'colleague' | 'other',
    currentTimezone: string = 'UTC',
  ): Promise<{
    letterGrade: string;
    insight: string;
  }> {
    try {
      const today = new Date();
      const todayString = today.toISOString().split('T')[0]; // YYYY-MM-DD

      // Get today's daily analysis for both people
      const calc1 = new BaziCalculator(
        person1Data.birthDateTime,
        person1Data.gender,
        person1Data.birthTimezone,
        person1Data.isTimeKnown,
      );
      const calc2 = new BaziCalculator(
        person2Data.birthDateTime,
        person2Data.gender,
        person2Data.birthTimezone,
        person2Data.isTimeKnown,
      );

      const todayDate = toDate(todayString, { timeZone: currentTimezone });
      const dailyAnalyses1 = calc1.getAnalysisForDateRange(
        todayDate,
        todayDate,
        currentTimezone,
        { type: 'personalized' },
      ) as PersonalizedDailyAnalysisOutput[];
      const dailyAnalyses2 = calc2.getAnalysisForDateRange(
        todayDate,
        todayDate,
        currentTimezone,
        { type: 'personalized' },
      ) as PersonalizedDailyAnalysisOutput[];

      if (
        !dailyAnalyses1 ||
        dailyAnalyses1.length === 0 ||
        !dailyAnalyses2 ||
        dailyAnalyses2.length === 0
      ) {
        // If daily analysis fails, return neutral
        return {
          letterGrade: 'C',
          insight: this.getDailyInsight('C', relationshipType),
        };
      }

      const daily1 = dailyAnalyses1[0];
      const daily2 = dailyAnalyses2[0];

      // Get today's day element for both
      const todayElement1 = daily1.dayPillar?.stemElement;
      const todayElement2 = daily2.dayPillar?.stemElement;

      // Get base analysis to check favorable elements
      const analysis1 = calc1.getCompleteAnalysis();
      const analysis2 = calc2.getCompleteAnalysis();
      if (!analysis1 || !analysis2) {
        return {
          letterGrade: 'C',
          insight: this.getDailyInsight('C', relationshipType),
        };
      }

      const userContext1 = BaziDataExtractor.buildUserContext(analysis1);
      const userContext2 = BaziDataExtractor.buildUserContext(analysis2);

      // Get their base element compatibility
      const identity1 = this.generateIdentity(userContext1);
      const identity2 = this.generateIdentity(userContext2);
      const baseElementInteraction = this.calculateElementInteraction(
        identity1.element as ElementType,
        identity2.element as ElementType,
      );

      // Check individual favorability
      const favorable1 = userContext1.favorableElements?.primary.includes(
        todayElement1,
      );
      const favorable2 = userContext2.favorableElements?.primary.includes(
        todayElement2,
      );
      const unfavorable1 = userContext1.favorableElements?.unfavorable.includes(
        todayElement1,
      );
      const unfavorable2 = userContext2.favorableElements?.unfavorable.includes(
        todayElement2,
      );

      // Check how today's elements interact with each other
      const todayElementInteraction = this.calculateElementInteraction(
        todayElement1,
        todayElement2,
      );

      // Calculate daily adjustment based on multiple factors
      let dailyAdjustment = 0;
      let insight = 'Base compatibility';

      // Factor 1: Individual favorability (0-6 points)
      if (favorable1 && favorable2) {
        dailyAdjustment += 6;
      } else if (favorable1 || favorable2) {
        dailyAdjustment += 3;
      } else if (unfavorable1 && unfavorable2) {
        dailyAdjustment -= 6;
      } else if (unfavorable1 || unfavorable2) {
        dailyAdjustment -= 3;
      }

      // Factor 2: How today's elements interact with each other (0-4 points)
      // If today's elements have a generative/harmonious interaction, it enhances compatibility
      if (todayElementInteraction.interactionType === 'Generative') {
        dailyAdjustment += 4;
      } else if (todayElementInteraction.interactionType === 'Harmonious') {
        dailyAdjustment += 2;
      } else if (todayElementInteraction.interactionType === 'Conflicting') {
        dailyAdjustment -= 4;
      } else if (todayElementInteraction.interactionType === 'Controlling') {
        dailyAdjustment -= 2;
      }

      // Factor 3: Alignment with base compatibility (0-3 points)
      // If today's interaction type matches their base interaction, it's reinforcing
      if (
        todayElementInteraction.interactionType ===
        baseElementInteraction.interactionType
      ) {
        dailyAdjustment += 3;
      } else if (
        (baseElementInteraction.interactionType === 'Generative' &&
          todayElementInteraction.interactionType === 'Harmonious') ||
        (baseElementInteraction.interactionType === 'Harmonious' &&
          todayElementInteraction.interactionType === 'Generative')
      ) {
        // Complementary positive interactions
        dailyAdjustment += 2;
      } else if (
        (baseElementInteraction.interactionType === 'Conflicting' &&
          todayElementInteraction.interactionType === 'Controlling') ||
        (baseElementInteraction.interactionType === 'Controlling' &&
          todayElementInteraction.interactionType === 'Conflicting')
      ) {
        // Both challenging interactions
        dailyAdjustment -= 2;
      }

      // Letter grade based on daily fluctuation (adjustment), not final score
      // This shows how good/bad TODAY is, regardless of base compatibility
      const letterGrade = this.adjustmentToLetterGrade(dailyAdjustment);

      // Generate relationship-specific insight based on letter grade
      insight = this.getDailyInsight(letterGrade, relationshipType);

      return {
        letterGrade,
        insight,
      };
    } catch (error) {
      // If any error, return neutral
      return {
        letterGrade: 'C',
        insight: this.getDailyInsight('C', relationshipType),
      };
    }
  }

  /**
   * Get relationship-specific daily insight based on letter grade
   */
  private getDailyInsight(
    letterGrade: string,
    relationshipType: 'romantic' | 'family' | 'friend' | 'colleague' | 'other',
  ): string {
    const insights: Record<
      string,
      Record<'romantic' | 'family' | 'friend' | 'colleague' | 'other', string>
    > = {
      'A+': {
        romantic:
          'Exceptional day for your relationship. Deep conversations flow naturally, and emotional connection feels effortless. Perfect day for meaningful moments together.',
        family:
          'Exceptional family harmony today. Communication is clear and supportive, making it ideal for resolving any lingering issues or celebrating together.',
        friend:
          'Your friendship shines today. You\'ll understand each other effortlessly and enjoy shared activities. Great day for making plans or having fun together.',
        colleague:
          'Exceptional professional synergy today. Collaboration feels natural, ideas flow freely, and you\'ll work together seamlessly. Perfect for important meetings or joint projects.',
        other:
          'Exceptional connection between you today. Interactions feel effortless and mutually beneficial, making it an ideal day for any shared activities.',
      },
      A: {
        romantic:
          'Your romantic connection is enhanced today. You\'ll feel more in sync emotionally, and it\'s a great day for quality time together or expressing feelings.',
        family:
          'Strong family harmony today. Everyone is more understanding and patient with each other. Good day for family activities or important conversations.',
        friend:
          'Your friendship is strengthened today. You\'ll enjoy each other\'s company more and find it easier to connect. Great day for catching up or doing something fun.',
        colleague:
          'Strong professional alignment today. You\'ll work well together, communicate clearly, and make good progress on shared goals. Ideal for collaborative tasks.',
        other:
          'Your connection is enhanced positively today. Interactions feel smooth and mutually supportive, making it a good day for any shared activities.',
      },
      'B+': {
        romantic:
          'Your relationship is well-supported today. You\'ll feel more connected and understanding of each other. Good day for spending time together or having meaningful conversations.',
        family:
          'Positive family dynamics today. Communication flows better than usual, and there\'s more patience and understanding. Suitable for family gatherings or discussions.',
        friend:
          'Your friendship feels more comfortable today. You\'ll enjoy each other\'s company and find it easy to connect. Nice day for casual hangouts or shared interests.',
        colleague:
          'Favorable working conditions today. You\'ll collaborate effectively and communicate well. Good day for team projects or important discussions.',
        other:
          'Your connection is supported positively today. Interactions feel comfortable and mutually beneficial, making it a pleasant day for shared activities.',
      },
      B: {
        romantic:
          'Your connection is slightly enhanced today. You\'ll feel a bit more in sync than usual. Decent day for casual time together or light conversations.',
        family:
          'Slightly better family dynamics today. Communication is smoother than average, and there\'s decent understanding. Fine day for routine family activities.',
        friend:
          'Your friendship feels slightly more comfortable today. You\'ll enjoy each other\'s company a bit more than usual. Nice day for casual interactions.',
        colleague:
          'Slightly favorable working conditions today. Collaboration feels smoother than average, and communication is decent. Fine day for regular work tasks.',
        other:
          'Your connection is slightly supported today. Interactions feel a bit more comfortable than usual, making it a decent day for shared activities.',
      },
      C: {
        romantic:
          'Neutral day for your relationship. It\'s an ordinary day with no significant shifts. Business as usual in your connection.',
        family:
          'Neutral family dynamics today. No major changes in how you interact. Routine day with standard family interactions.',
        friend:
          'Neutral day for your friendship. It\'s a regular day with typical interactions. Nothing special, nothing challenging.',
        colleague:
          'Neutral working conditions today. Standard collaboration and communication. Normal day for work interactions.',
        other:
          'Neutral day for your connection. Interactions are routine with no significant changes. Ordinary day.',
      },
      'D+': {
        romantic:
          'Minor friction in your relationship today. You might feel slightly out of sync or have small misunderstandings. Best to be patient and communicate clearly.',
        family:
          'Minor family tension today. Small misunderstandings or irritations may arise. Good day to practice patience and avoid sensitive topics.',
        friend:
          'Slight awkwardness in your friendship today. You might feel a bit disconnected or have minor miscommunications. Best to keep interactions light.',
        colleague:
          'Minor professional friction today. Communication might be slightly off, or you may have small disagreements. Good day to be extra clear and patient.',
        other:
          'Minor challenges in your connection today. Interactions might feel slightly strained or awkward. Best to keep things simple and be patient.',
      },
      D: {
        romantic:
          'Noticeable challenges in your relationship today. You may feel disconnected or have misunderstandings. Best to avoid important conversations and give each other space.',
        family:
          'Noticeable family tension today. Communication may be difficult, and misunderstandings are more likely. Good day to avoid sensitive topics and be extra patient.',
        friend:
          'Your friendship feels strained today. You might feel disconnected or have miscommunications. Best to keep interactions brief and light.',
        colleague:
          'Noticeable professional challenges today. Communication may be difficult, and collaboration could feel strained. Good day to be extra clear and avoid complex projects.',
        other:
          'Noticeable challenges in your connection today. Interactions may feel strained or uncomfortable. Best to keep things simple and be patient.',
      },
      F: {
        romantic:
          'Significant challenges in your relationship today. You may feel very out of sync, have major misunderstandings, or experience emotional friction. Best to avoid important discussions and give each other space today.',
        family:
          'Significant family tension today. Communication will be difficult, and conflicts are more likely. Best to avoid sensitive topics, practice extra patience, and consider postponing important family discussions.',
        friend:
          'Your friendship feels very strained today. You might feel disconnected, have major miscommunications, or experience awkwardness. Best to keep interactions minimal and avoid deep conversations.',
        colleague:
          'Significant professional challenges today. Communication will be difficult, collaboration will feel strained, and misunderstandings are likely. Best to avoid important meetings, be extra clear in communications, and postpone complex projects if possible.',
        other:
          'Significant challenges in your connection today. Interactions will feel very strained or uncomfortable. Best to minimize contact, keep things simple, and be extra patient if interaction is necessary.',
      },
    };

    return insights[letterGrade]?.[relationshipType] || 'Neutral day for your connection';
  }

  /**
   * Convert daily adjustment to letter grade
   * Letter grade reflects how good/bad TODAY is, regardless of base compatibility
   * A+ = exceptional day, F = very challenging day
   */
  private adjustmentToLetterGrade(adjustment: number): string {
    if (adjustment >= 10) return 'A+';
    if (adjustment >= 7) return 'A';
    if (adjustment >= 4) return 'B+';
    if (adjustment >= 1) return 'B';
    if (adjustment >= -1) return 'C';
    if (adjustment >= -4) return 'D+';
    if (adjustment >= -7) return 'D';
    return 'F';
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
      // When reverse pair is found, element2 controls element1
      // Generate description from Person1's perspective (element1)
      const reverseDescription = controllingPairs[reversePairKey];
      // Swap the description: if template says "Fire controls Metal—your intensity refines their structure"
      // and we have Metal-Fire, we need "Metal is controlled by Fire—their intensity refines your structure"
      // But simpler: just swap "your" and "their" and adjust the control direction
      const swappedDescription = reverseDescription
        .replace(/your/g, 'TEMP_YOUR')
        .replace(/their/g, 'your')
        .replace(/TEMP_YOUR/g, 'their')
        .replace(new RegExp(`${element2} controls ${element1}`, 'i'), `${element2} controls ${element1}`)
        .replace(new RegExp(`${element2}—`, 'i'), `${element2}—`);
      
      return {
        person1Element: element1,
        person2Element: element2,
        interactionType: 'Controlling',
        cycle: `${element2} controls ${element1}`,
        description: `${element2} controls ${element1}—${swappedDescription.split('—')[1] || swappedDescription}`,
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
   * Base weights (for romantic relationships):
   * - 40%: Ten Gods harmony (how charts support each other)
   * - 25%: Marriage Palace (Day Branch interactions) - romantic focus
   * - 20%: Favorable element match
   * - 10%: Element cycle harmony
   * - 5%: Chart strength balance
   *
   * Weights adjust based on relationship type:
   * - Romantic: Full Marriage Palace weight (25%)
   * - Colleague: Reduced Marriage Palace (5%), increased Ten Gods (50%), increased Favorable Elements (30%)
   * - Family: Reduced Marriage Palace (10%), increased Ten Gods (45%)
   * - Friend: Reduced Marriage Palace (15%), increased Ten Gods (42%)
   * - Other: Reduced Marriage Palace (15%), increased Ten Gods (42%)
   */
  private calculateCompatibilityScore(
    userContext1: UserContext,
    userContext2: UserContext,
    interactionType: string,
    relationshipType?: 'romantic' | 'family' | 'friend' | 'colleague' | 'other',
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
    // Calculate raw scores for each factor
    const tenGodsRaw = this.calculateTenGodsHarmony(userContext1, userContext2);
    const marriagePalaceRaw = this.calculateMarriagePalaceScore(
      userContext1.natalStructure.personal.branch,
      userContext2.natalStructure.personal.branch,
    );
    const favorableRaw = this.calculateFavorableElementMatch(
      userContext1,
      userContext2,
    );
    const elementCycleRaw = this.calculateElementCycleScore(interactionType);
    const balanceRaw = this.calculateChartStrengthBalance(
      userContext1.chartStrength.strength,
      userContext2.chartStrength.strength,
    );

    // Define factor weights based on relationship type
    // Format: [Ten Gods, Marriage Palace, Favorable Elements, Element Cycle, Chart Balance]
    const weightProfiles: Record<
      'romantic' | 'family' | 'friend' | 'colleague' | 'other',
      [number, number, number, number, number]
    > = {
      romantic: [40, 25, 20, 10, 5], // Traditional weights - Marriage Palace important
      colleague: [50, 5, 30, 10, 5], // Minimal Marriage Palace, emphasize Ten Gods & Favorable Elements
      family: [45, 10, 25, 12, 8], // Reduced Marriage Palace, balanced other factors
      friend: [42, 15, 23, 12, 8], // Slightly reduced Marriage Palace
      other: [42, 15, 23, 12, 8], // Same as friend
    };

    const weights =
      weightProfiles[relationshipType || 'romantic'] || weightProfiles.romantic;

    // Apply weights to raw scores (normalize to 0-100 scale)
    let score = 0;
    score += (tenGodsRaw / 40) * weights[0]; // Ten Gods (0-40 raw → weighted)
    score += (marriagePalaceRaw / 25) * weights[1]; // Marriage Palace (0-25 raw → weighted)
    score += (favorableRaw / 20) * weights[2]; // Favorable Elements (0-20 raw → weighted)
    score += (elementCycleRaw / 10) * weights[3]; // Element Cycle (0-10 raw → weighted)
    score += (balanceRaw / 5) * weights[4]; // Chart Balance (0-5 raw → weighted)

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
   * Get base compatibility score (0-100) without LLM calls
   * Lightweight method for endpoints that only need a score, not full analysis
   */
  async getBaseCompatibilityScore(
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
    relationshipType?: 'romantic' | 'family' | 'friend' | 'colleague' | 'other',
  ): Promise<number> {
    // Build UserContext for both people (fast, no LLM)
    const calc1 = new BaziCalculator(
      person1Data.birthDateTime,
      person1Data.gender,
      person1Data.birthTimezone,
      person1Data.isTimeKnown,
    );
    const calc2 = new BaziCalculator(
      person2Data.birthDateTime,
      person2Data.gender,
      person2Data.birthTimezone,
      person2Data.isTimeKnown,
    );

    const analysis1 = calc1.getCompleteAnalysis();
    const analysis2 = calc2.getCompleteAnalysis();
    if (!analysis1 || !analysis2) {
      return 50; // Default neutral score
    }

    const userContext1 = BaziDataExtractor.buildUserContext(analysis1);
    const userContext2 = BaziDataExtractor.buildUserContext(analysis2);

    // Get element interaction
    const identity1 = this.generateIdentity(userContext1);
    const identity2 = this.generateIdentity(userContext2);
    const elementInteraction = this.calculateElementInteraction(
      identity1.element as ElementType,
      identity2.element as ElementType,
    );

    // Calculate score using lightweight method (no LLM)
    const scoreResult = this.calculateCompatibilityScore(
      userContext1,
      userContext2,
      elementInteraction.interactionType,
      relationshipType,
    );

    return scoreResult.overall;
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
  private async generateCompatibilityIntroduction(
    identity1: any,
    identity2: any,
    elementInteraction: any,
    scoreBreakdownSummary: any | null,
    overallScore: number | null,
  ): Promise<string> {
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

    // Add context (no score-based context anymore since we removed scoring)
    const context = 'This creates a unique dynamic that shapes how you connect across different areas of life.';

    return `${elementExplanation} ${context}`;
  }

  /**
   * Get description of element interaction type for LLM prompts
   */
  private getInteractionTypeDescription(
    interactionType: 'Generative' | 'Controlling' | 'Harmonious' | 'Conflicting' | 'Neutral',
    element1: string,
    element2: string,
  ): string {
    switch (interactionType) {
      case 'Generative':
        return `${element1} creates/nourishes ${element2} - natural support and growth. Scores should lean toward Compatible/Highly Compatible.`;
      case 'Controlling':
        return `${element1} controls/challenges ${element2} - creates structure but requires balance. Scores should be Neutral to Challenging depending on context.`;
      case 'Harmonious':
        return `Both share ${element1} energy - natural resonance and understanding. Scores should lean toward Compatible/Highly Compatible.`;
      case 'Conflicting':
        return `${element1} and ${element2} create tension - can spark innovation but requires effort. Scores should be Challenging to Highly Challenging.`;
      case 'Neutral':
        return `${element1} and ${element2} have minimal interaction - compatibility depends on other factors. Scores should be Neutral to Compatible.`;
      default:
        return 'Mixed interactions - evaluate based on other chart factors.';
    }
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
    // Visual should show who controls/creates whom based on cycle direction
    let visual: string;
    if (elementInteraction.interactionType === 'Controlling' || elementInteraction.interactionType === 'Generative') {
      // Extract direction from cycle: "Fire controls Metal" or "Fire creates Metal"
      const cycleParts = elementInteraction.cycle.split(' ');
      if (cycleParts.length >= 3 && (cycleParts[1] === 'controls' || cycleParts[1] === 'creates')) {
        const controller = cycleParts[0];
        const controlled = cycleParts[2];
        visual = `${controller} → ${controlled}`;
      } else {
        // Fallback to original
        visual = `${identity1.element} → ${identity2.element}`;
      }
    } else {
      visual = `${identity1.element} ↔ ${identity2.element}`;
    }
    
    const interaction = {
      visual,
      type: elementInteraction.interactionType,
      description: elementInteraction.description,
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
    score: any | null,
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
      model: geminiClient('gemini-2.5-flash'),
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

  /**
   * Calculate baseline scores for percentile normalization
   * Uses daily analysis to get average score
   */
  private calculateBaselineScores(
    userContext: UserContext,
    luckEra: RawBaziData['luckEra'],
  ): {
    overall: number;
    career: number;
    wealth: number;
    relationships: number;
    health: number;
    creativity: number;
  } {
    // Baseline is just the average (50) + luck era adjustments
    // This represents the user's "average day" without hourly variation
    const baseScore = 50;
    let career = baseScore;
    let wealth = baseScore;
    let relationships = baseScore;
    let health = baseScore;
    let creativity = baseScore;

    // Add luck era Ten God adjustments (constant for the day)
    if (luckEra?.tenGod) {
      const tenGodAdjustments = this.getTenGodCategoryAdjustments(luckEra.tenGod);
      career += tenGodAdjustments.career;
      wealth += tenGodAdjustments.wealth;
      relationships += tenGodAdjustments.relationships;
      health += tenGodAdjustments.health;
      creativity += tenGodAdjustments.creativity;
    }

    return {
      overall: Math.round((career + wealth + relationships + health + creativity) / 5),
      career: Math.round(career),
      wealth: Math.round(wealth),
      relationships: Math.round(relationships),
      health: Math.round(health),
      creativity: Math.round(creativity),
    };
  }

  /**
   * Normalize scores relative to baseline for meaningful daily variation
   * Ensures everyone experiences good and bad days regardless of natal chart strength
   */
  private normalizeScoresRelativeToBaseline(
    scores: { overall: number; career: number; wealth: number; relationships: number; health: number; creativity: number },
    baseline: { overall: number; career: number; wealth: number; relationships: number; health: number; creativity: number },
  ): {
    overall: number;
    career: number;
    wealth: number;
    relationships: number;
    health: number;
    creativity: number;
  } {
    // Calculate deviation from baseline
    const careerDeviation = scores.career - baseline.career;
    const wealthDeviation = scores.wealth - baseline.wealth;
    const relationshipsDeviation = scores.relationships - baseline.relationships;
    const healthDeviation = scores.health - baseline.health;
    const creativityDeviation = scores.creativity - baseline.creativity;

    // Map deviation to percentile-based score (ensures meaningful variation)
    const career = this.mapDeviationToScore(careerDeviation);
    const wealth = this.mapDeviationToScore(wealthDeviation);
    const relationships = this.mapDeviationToScore(relationshipsDeviation);
    const health = this.mapDeviationToScore(healthDeviation);
    const creativity = this.mapDeviationToScore(creativityDeviation);

    return {
      overall: Math.round((career + wealth + relationships + health + creativity) / 5),
      career,
      wealth,
      relationships,
      health,
      creativity,
    };
  }

  /**
   * Map deviation from baseline to a 0-100 score
   * For hourly scores: allows wider variation since we only use variable factors
   */
  private mapDeviationToScore(deviation: number): number {
    // For hourly scores, allow wider variation (-40 to +40) since we removed constants
    const normalizedDeviation = Math.max(-40, Math.min(40, deviation));

    // Map to 0-100 score: baseline (50) + deviation
    const score = 50 + normalizedDeviation;

    // Clamp to 0-100
    return Math.max(0, Math.min(100, Math.round(score)));
  }

  /**
   * Get today's full BaZi data for LLM generation
   * Returns scores, userContext, dailyRawData, and dailyAnalysis
   */
  async getTodayForecastData(
    birthDateTime: Date,
    gender: 'male' | 'female',
    birthTimezone: string,
    isTimeKnown: boolean,
    targetDate: Date,
    currentTimezone: string,
  ): Promise<{
    scores: {
      overall: number;
      career: number;
      wealth: number;
      relationships: number;
      health: number;
      creativity: number;
    };
    userContext: UserContext;
    dailyRawData: RawBaziData;
    dailyAnalysis: PersonalizedDailyAnalysisOutput;
  }> {
    const calculator = new BaziCalculator(
      birthDateTime,
      gender,
      birthTimezone,
      isTimeKnown,
    );

    const baseAnalysis = calculator.getCompleteAnalysis();
    if (!baseAnalysis) {
      throw new Error('Failed to get complete analysis');
    }

    const userContext = BaziDataExtractor.buildUserContext(baseAnalysis);

    const dailyAnalysis = calculator.getAnalysisForDate(
      targetDate,
      currentTimezone,
      { type: 'personalized' },
    ) as PersonalizedDailyAnalysisOutput | null;

    if (!dailyAnalysis) {
      throw new Error('Failed to get daily analysis');
    }

    // Get general analysis for annual/monthly pillars
    const generalAnalysis = calculator.getAnalysisForDate(
      targetDate,
      currentTimezone,
      { type: 'general' },
    ) as any;

    const dailyRawData = BaziDataExtractor.extract(userContext, dailyAnalysis, generalAnalysis);
    
    // Debug Hour pillar Ten God
    if (isTimeKnown) {
      const hourPillar = baseAnalysis.detailedPillars?.hour;
      const dayMasterStem = baseAnalysis.detailedPillars?.day?.heavenlyStem;
      
      this.logger.log(`🔍 Hour Pillar Debug (isTimeKnown=${isTimeKnown}):`);
      this.logger.log(`  - hourPillar exists: ${!!hourPillar}`);
      if (hourPillar) {
        this.logger.log(`  - hourPillar.heavenlyStem exists: ${!!hourPillar.heavenlyStem}`);
        this.logger.log(`  - hourPillar.heavenlyStemTenGod exists: ${!!hourPillar.heavenlyStemTenGod}`);
        if (hourPillar.heavenlyStemTenGod) {
          this.logger.log(`  - hourPillar.heavenlyStemTenGod.name: ${hourPillar.heavenlyStemTenGod.name || 'null'}`);
        }
        if (hourPillar.heavenlyStem) {
          this.logger.log(`  - Hour stem: ${hourPillar.heavenlyStem.character} (${hourPillar.heavenlyStem.elementType}-${hourPillar.heavenlyStem.yinYang})`);
        }
        if (dayMasterStem) {
          this.logger.log(`  - Day Master stem: ${dayMasterStem.character} (${dayMasterStem.elementType}-${dayMasterStem.yinYang})`);
          this.logger.log(`  - Hour stem === Day Master stem: ${hourPillar.heavenlyStem?.value === dayMasterStem.value}`);
        }
      }
      this.logger.log(`  - dailyRawData.natalStructure.innovation exists: ${!!dailyRawData.natalStructure.innovation}`);
      if (dailyRawData.natalStructure.innovation) {
        this.logger.log(`  - dailyRawData.natalStructure.innovation.tenGod: ${dailyRawData.natalStructure.innovation.tenGod || 'null'}`);
      }
    }
    
    // Fix transit Ten Gods (Annual and Monthly) - calculate relative to Day Master
    const dayMasterStem = baseAnalysis.detailedPillars?.day?.heavenlyStem;
    if (dayMasterStem && generalAnalysis) {
      try {
        // Map Pinyin Ten God names to canonical English names
        const mapPinyinToCanonical: Record<string, string> = {
          'Zheng Guan': 'Direct Officer',
          'Qi Sha': '7 Killings',
          'Zheng Cai': 'Direct Wealth',
          'Pian Cai': 'Indirect Wealth',
          'Zheng Yin': 'Direct Resource',
          'Pian Yin': 'Indirect Resource',
          'Shi Shen': 'Eating God',
          'Shang Guan': 'Hurting Officer',
          'Bi Jian': 'Friend',
          'Jie Cai': 'Rob Wealth',
        };

        // Fix Annual pillar Ten God
        const annualPillarContext = generalAnalysis.annualPillarContext as any;
        if (annualPillarContext?.stemElement && annualPillarContext?.stemYinYang && dailyRawData.periodContext?.annualPillar) {
          // Construct stem object matching dayMasterStem structure (elementType, yinYang, value)
          const annualStem = {
            elementType: annualPillarContext.stemElement,
            yinYang: annualPillarContext.stemYinYang,
            value: dayMasterStem.value || 0, // value is numeric index (0-9), use dayMasterStem's if available
          };
          
          // Use traditional calculation method (more reliable than library's calculateTenGod)
          const tenGodPinyin = this.calculateTenGodTraditional(dayMasterStem, annualStem);
          const annualTenGod = mapPinyinToCanonical[tenGodPinyin] || tenGodPinyin;
          
          (dailyRawData.periodContext.annualPillar as any).tenGod = annualTenGod;
          this.logger.log(`✅ Fixed Annual Ten God: ${annualTenGod} (from ${tenGodPinyin})`);
        }

        // Fix Monthly pillar Ten God
        const monthlyPillarContext = generalAnalysis.monthlyPillarContext as any;
        if (monthlyPillarContext?.stemElement && monthlyPillarContext?.stemYinYang && dailyRawData.periodContext?.monthlyPillar) {
          // Construct stem object matching dayMasterStem structure (elementType, yinYang, value)
          const monthlyStem = {
            elementType: monthlyPillarContext.stemElement,
            yinYang: monthlyPillarContext.stemYinYang,
            value: dayMasterStem.value || 0, // value is numeric index (0-9), use dayMasterStem's if available
          };
          
          // Use traditional calculation method (more reliable than library's calculateTenGod)
          const tenGodPinyin = this.calculateTenGodTraditional(dayMasterStem, monthlyStem);
          const monthlyTenGod = mapPinyinToCanonical[tenGodPinyin] || tenGodPinyin;
          
          (dailyRawData.periodContext.monthlyPillar as any).tenGod = monthlyTenGod;
          this.logger.log(`✅ Fixed Monthly Ten God: ${monthlyTenGod} (from ${tenGodPinyin})`);
        }
      } catch (error) {
        this.logger.warn(`Could not calculate transit Ten Gods: ${error}`);
        this.logger.warn(`Error stack: ${(error as Error).stack}`);
      }
    } else {
      this.logger.warn(`⚠️ Missing prerequisites for transit Ten God calculation: dayMasterStem=${!!dayMasterStem}, generalAnalysis=${!!generalAnalysis}`);
    }
    
    // Fix luck era if it's null but user is actually in a luck cycle
    // Use age-based detection (same as getLuckCycles) since getCurrentLuckPillar has date comparison issues
    this.logger.log(`🔍 Luck Era Debug: dailyRawData.luckEra=${!!dailyRawData.luckEra}, tenGod=${dailyRawData.luckEra?.tenGod || 'null'}, isTimeKnown=${isTimeKnown}`);
    if (!dailyRawData.luckEra || !dailyRawData.luckEra.tenGod) {
      const allLuckPillars = baseAnalysis.luckPillars?.pillars || [];
      this.logger.log(`🔍 Luck Era Debug: allLuckPillars.length=${allLuckPillars.length}`);
      
      if (allLuckPillars.length > 0) {
        // Calculate current age
        const currentAge = Math.floor((targetDate.getTime() - birthDateTime.getTime()) / (1000 * 60 * 60 * 24 * 365.25));
        const currentYear = targetDate.getFullYear();
        this.logger.log(`🔍 Luck Era Debug: currentAge=${currentAge}, currentYear=${currentYear}, birthYear=${birthDateTime.getFullYear()}`);
        
        // Fill in missing yearStart/yearEnd for pillars when time is unknown (same as getLuckCycles)
        if (!isTimeKnown) {
          const birthYear = birthDateTime.getFullYear();
          const estimatedFirstPillarStartAge = 8;
          const estimatedFirstPillarStartYear = birthYear + estimatedFirstPillarStartAge;
          
          for (let i = 1; i < allLuckPillars.length; i++) {
            const pillar = allLuckPillars[i];
            if (pillar.yearStart === null || pillar.yearEnd === null) {
              const pillarStartYear = estimatedFirstPillarStartYear + (i - 1) * 10;
              const pillarEndYear = pillarStartYear + 9;
              (pillar as any).yearStart = pillarStartYear;
              (pillar as any).yearEnd = pillarEndYear;
              (pillar as any).ageStart = estimatedFirstPillarStartAge + (i - 1) * 10;
              this.logger.log(`🔍 Luck Era Debug: Filled Pillar ${i}: ageStart=${(pillar as any).ageStart}, yearStart=${pillarStartYear}, yearEnd=${pillarEndYear}`);
            }
          }
        }
        
        // Find current luck pillar by age/year (skip Pillar 0 - Pre-Luck Era)
        let currentLuckPillar = null;
        let foundPillarIndex = -1;
        for (let i = 1; i < allLuckPillars.length; i++) {
          const pillar = allLuckPillars[i];
          const ageStart = pillar.ageStart;
          const pillarAgeEnd = ageStart !== null ? ageStart + 9 : null; // Each cycle is 10 years
          const yearStart = pillar.yearStart;
          const yearEnd = pillar.yearEnd;
          
          this.logger.log(`🔍 Luck Era Debug: Pillar ${i}: ageStart=${ageStart}, ageEnd=${pillarAgeEnd}, yearStart=${yearStart}, yearEnd=${yearEnd}`);
          
          // Check if current age/year falls within this pillar's range
          const ageMatch = ageStart !== null && pillarAgeEnd !== null && currentAge >= ageStart && currentAge <= pillarAgeEnd;
          const yearMatch = yearStart !== null && yearEnd !== null && currentYear >= yearStart && currentYear <= yearEnd;
          
          this.logger.log(`🔍 Luck Era Debug: Pillar ${i}: ageMatch=${ageMatch}, yearMatch=${yearMatch}`);
          
          if (ageMatch || yearMatch) {
            currentLuckPillar = pillar;
            foundPillarIndex = i;
            this.logger.log(`🔍 Luck Era Debug: ✅ Found matching pillar at index ${i}`);
            break;
          }
        }
        
        if (currentLuckPillar) {
          // User is in an actual luck cycle (not Pre-Luck Era)
          // Calculate Ten God for this pillar
          const dayMasterStem = baseAnalysis.detailedPillars?.day?.heavenlyStem;
          const luckPillarStem = currentLuckPillar.heavenlyStem;
          
          this.logger.log(`🔍 Luck Era Debug: dayMasterStem=${!!dayMasterStem}, luckPillarStem=${!!luckPillarStem}`);
          
          if (dayMasterStem && luckPillarStem) {
            // Use traditional calculation method (more reliable than library's calculateTenGod)
            try {
              // Map Pinyin Ten God names to canonical English names
              const mapPinyinToCanonical: Record<string, string> = {
                'Zheng Guan': 'Direct Officer',
                'Qi Sha': '7 Killings',
                'Zheng Cai': 'Direct Wealth',
                'Pian Cai': 'Indirect Wealth',
                'Zheng Yin': 'Direct Resource',
                'Pian Yin': 'Indirect Resource',
                'Shi Shen': 'Eating God',
                'Shang Guan': 'Hurting Officer',
                'Bi Jian': 'Friend',
                'Jie Cai': 'Rob Wealth',
              };
              
              // Use traditional calculation method
              const tenGodPinyin = this.calculateTenGodTraditional(dayMasterStem, luckPillarStem);
              const tenGodName = mapPinyinToCanonical[tenGodPinyin] || tenGodPinyin;
              
              dailyRawData.luckEra = {
                tenGod: tenGodName,
                stemElement: luckPillarStem.elementType as ElementType,
                stemYinYang: luckPillarStem.yinYang as 'Yin' | 'Yang',
              };
              
              this.logger.log(`✅ Fixed luck era: ${tenGodName} (from ${tenGodPinyin}, ${luckPillarStem.elementType}) for age ${currentAge}, pillar index ${foundPillarIndex}`);
            } catch (error) {
              // If we can't calculate Ten God, leave luckEra as null (Pre-Luck Era)
              this.logger.warn(`Could not calculate Ten God for luck pillar: ${error}`);
              this.logger.warn(`Error stack: ${(error as Error).stack}`);
            }
          } else {
            this.logger.warn(`⚠️ Missing stems for luck era calculation: dayMasterStem=${!!dayMasterStem}, luckPillarStem=${!!luckPillarStem}`);
          }
        } else {
          this.logger.log(`⚠️ No luck pillar found for age ${currentAge}, year ${currentYear} - treating as Pre-Luck Era`);
        }
      } else {
        this.logger.warn(`⚠️ No luck pillars available in baseAnalysis`);
      }
    } else {
      this.logger.log(`✅ Luck era already exists: ${dailyRawData.luckEra.tenGod || 'null'} (${dailyRawData.luckEra.stemElement})`);
    }
    
    const scores = this.calculateTodayScores(
      dailyRawData,
      userContext,
      dailyAnalysis,
      undefined, // analysisDate
      undefined, // hourPillarElement
      undefined, // hourPillarTenGod
      undefined, // hourPillarBranchElement
      baseAnalysis, // baseAnalysis for daily pillar Ten God
    );

    // Normalize using baseline
    const baseline = this.calculateBaselineScores(userContext, dailyRawData.luckEra);
    const normalizedScores = this.normalizeScoresRelativeToBaseline(scores, baseline);

    return {
      scores: normalizedScores,
      userContext,
      dailyRawData,
      dailyAnalysis,
    };
  }

  /**
   * Get 14-day forecast data (scores and BaZi data for each day)
   * Returns data for next 14 days from startDate
   */
  async get14DayForecastData(
    birthDateTime: Date,
    gender: 'male' | 'female',
    birthTimezone: string,
    isTimeKnown: boolean,
    startDate: Date,
    currentTimezone: string,
  ): Promise<{
    days: Array<{
      date: string; // YYYY-MM-DD
      scores: {
        overall: number;
        career: number;
        wealth: number;
        relationships: number;
        health: number;
        creativity: number;
        rest: number; // Inverse of overall (100 - overall)
      };
      dailyElement: string; // e.g., "WOOD-O"
      dailyBranch: string; // e.g., "午"
      monthlyElement: string; // e.g., "WOOD-O" (monthly element for this day)
      elementRelationship: 'favorable' | 'unfavorable' | 'neutral';
      activeTenGods: string[]; // Ten God technical names active on this day (for backward compatibility)
      activeTenGodsFull: any[]; // Full ActiveTenGod objects (like daily forecast)
      specialPatterns: string[]; // Special pattern names active on this day (for backward compatibility)
      specialPatternsFull: any[]; // Full special pattern objects (like daily forecast)
      dailyRawData: any; // Full raw BaZi data for this day
      dailyAnalysis: any; // Full daily analysis for this day
    }>;
    userContext: UserContext;
  }> {
    const calculator = new BaziCalculator(
      birthDateTime,
      gender,
      birthTimezone,
      isTimeKnown,
    );

    const baseAnalysis = calculator.getCompleteAnalysis();
    if (!baseAnalysis) {
      throw new Error('Failed to get complete analysis');
    }

    const userContext = BaziDataExtractor.buildUserContext(baseAnalysis);

    const days: Array<{
      date: string;
      scores: {
        overall: number;
        career: number;
        wealth: number;
        relationships: number;
        health: number;
        creativity: number;
        rest: number;
      };
      dailyElement: string;
      dailyBranch: string;
      monthlyElement: string;
      elementRelationship: 'favorable' | 'unfavorable' | 'neutral';
      activeTenGods: string[];
      activeTenGodsFull: any[];
      specialPatterns: string[];
      specialPatternsFull: any[];
      dailyRawData: any;
      dailyAnalysis: any;
    }> = [];

    // Calculate data for each of the 14 days
    for (let i = 0; i < 14; i++) {
      const targetDate = addDays(startDate, i);
      const dateString = formatInTimeZone(targetDate, currentTimezone, 'yyyy-MM-dd');

      // Get daily analysis
      const dailyAnalysis = calculator.getAnalysisForDate(
        targetDate,
        currentTimezone,
        { type: 'personalized' },
      ) as PersonalizedDailyAnalysisOutput | null;

      if (!dailyAnalysis) {
        throw new Error(`Failed to get daily analysis for ${dateString}`);
      }

      // Get general analysis for monthly element
      const generalAnalysis = calculator.getAnalysisForDate(
        targetDate,
        currentTimezone,
        { type: 'general' },
      ) as any;

      // Extract BaZi data
      const dailyRawData = BaziDataExtractor.extract(
        userContext,
        dailyAnalysis,
        generalAnalysis,
      );

      // Fix transit Ten Gods (Annual and Monthly) - calculate relative to Day Master
      // Same logic as getTodayForecastData
      const dayMasterStem = baseAnalysis.detailedPillars?.day?.heavenlyStem;
      if (dayMasterStem && generalAnalysis) {
        try {
          // Map Pinyin Ten God names to canonical English names
          const mapPinyinToCanonical: Record<string, string> = {
            'Zheng Guan': 'Direct Officer',
            'Qi Sha': '7 Killings',
            'Zheng Cai': 'Direct Wealth',
            'Pian Cai': 'Indirect Wealth',
            'Zheng Yin': 'Direct Resource',
            'Pian Yin': 'Indirect Resource',
            'Shi Shen': 'Eating God',
            'Shang Guan': 'Hurting Officer',
            'Bi Jian': 'Friend',
            'Jie Cai': 'Rob Wealth',
          };

          // Fix Annual pillar Ten God
          const annualPillarContext = generalAnalysis.annualPillarContext as any;
          if (annualPillarContext?.stemElement && annualPillarContext?.stemYinYang && dailyRawData.periodContext?.annualPillar) {
            // Construct stem object matching dayMasterStem structure (elementType, yinYang, value)
            const annualStem = {
              elementType: annualPillarContext.stemElement,
              yinYang: annualPillarContext.stemYinYang,
              value: dayMasterStem.value || 0, // value is numeric index (0-9), use dayMasterStem's if available
            };
            
            // Use traditional calculation method (more reliable than library's calculateTenGod)
            const tenGodPinyin = this.calculateTenGodTraditional(dayMasterStem, annualStem);
            const annualTenGod = mapPinyinToCanonical[tenGodPinyin] || tenGodPinyin;
            
            (dailyRawData.periodContext.annualPillar as any).tenGod = annualTenGod;
            this.logger.log(`✅ Fixed Annual Ten God: ${annualTenGod} (from ${tenGodPinyin})`);
          }

          // Fix Monthly pillar Ten God
          const monthlyPillarContext = generalAnalysis.monthlyPillarContext as any;
          if (monthlyPillarContext?.stemElement && monthlyPillarContext?.stemYinYang && dailyRawData.periodContext?.monthlyPillar) {
            // Construct stem object matching dayMasterStem structure (elementType, yinYang, value)
            const monthlyStem = {
              elementType: monthlyPillarContext.stemElement,
              yinYang: monthlyPillarContext.stemYinYang,
              value: dayMasterStem.value || 0, // value is numeric index (0-9), use dayMasterStem's if available
            };
            
            // Use traditional calculation method (more reliable than library's calculateTenGod)
            const tenGodPinyin = this.calculateTenGodTraditional(dayMasterStem, monthlyStem);
            const monthlyTenGod = mapPinyinToCanonical[tenGodPinyin] || tenGodPinyin;
            
            (dailyRawData.periodContext.monthlyPillar as any).tenGod = monthlyTenGod;
            this.logger.log(`✅ Fixed Monthly Ten God: ${monthlyTenGod} (from ${tenGodPinyin})`);
          }
        } catch (error) {
          this.logger.warn(`Could not calculate transit Ten Gods: ${error}`);
          this.logger.warn(`Error stack: ${(error as Error).stack}`);
        }
      } else {
        this.logger.warn(`⚠️ Missing prerequisites for transit Ten God calculation: dayMasterStem=${!!dayMasterStem}, generalAnalysis=${!!generalAnalysis}`);
      }
      
      // Fix luck era if it's null but user is actually in a luck cycle
      // Use age-based detection (same as getLuckCycles) since getCurrentLuckPillar has date comparison issues
      if (!dailyRawData.luckEra || !dailyRawData.luckEra.tenGod) {
        const allLuckPillars = baseAnalysis.luckPillars?.pillars || [];
        
        if (allLuckPillars.length > 0) {
          // Calculate current age
          const currentAge = Math.floor((targetDate.getTime() - birthDateTime.getTime()) / (1000 * 60 * 60 * 24 * 365.25));
          const currentYear = targetDate.getFullYear();
          
          // Fill in missing yearStart/yearEnd for pillars when time is unknown (same as getLuckCycles)
          if (!isTimeKnown) {
            const birthYear = birthDateTime.getFullYear();
            const estimatedFirstPillarStartAge = 8;
            const estimatedFirstPillarStartYear = birthYear + estimatedFirstPillarStartAge;
            
            for (let i = 1; i < allLuckPillars.length; i++) {
              const pillar = allLuckPillars[i];
              if (pillar.yearStart === null || pillar.yearEnd === null) {
                const pillarStartYear = estimatedFirstPillarStartYear + (i - 1) * 10;
                const pillarEndYear = pillarStartYear + 9;
                (pillar as any).yearStart = pillarStartYear;
                (pillar as any).yearEnd = pillarEndYear;
                (pillar as any).ageStart = estimatedFirstPillarStartAge + (i - 1) * 10;
              }
            }
          }
          
          // Find current luck pillar by age/year (skip Pillar 0 - Pre-Luck Era)
          let currentLuckPillar = null;
          let foundPillarIndex = -1;
          for (let i = 1; i < allLuckPillars.length; i++) {
            const pillar = allLuckPillars[i];
            const ageStart = pillar.ageStart;
            const pillarAgeEnd = ageStart !== null ? ageStart + 9 : null; // Each cycle is 10 years
            const yearStart = pillar.yearStart;
            const yearEnd = pillar.yearEnd;
            
            // Check if current age/year falls within this pillar's range
            const ageMatch = ageStart !== null && pillarAgeEnd !== null && currentAge >= ageStart && currentAge <= pillarAgeEnd;
            const yearMatch = yearStart !== null && yearEnd !== null && currentYear >= yearStart && currentYear <= yearEnd;
            
            if (ageMatch || yearMatch) {
              currentLuckPillar = pillar;
              foundPillarIndex = i;
              break;
            }
          }
          
          if (currentLuckPillar) {
            // User is in an actual luck cycle (not Pre-Luck Era)
            // Calculate Ten God for this pillar
            const dayMasterStemForLuck = baseAnalysis.detailedPillars?.day?.heavenlyStem;
            const luckPillarStem = currentLuckPillar.heavenlyStem;
            
            if (dayMasterStemForLuck && luckPillarStem) {
              // Use traditional calculation method (more reliable than library's calculateTenGod)
              try {
                // Map Pinyin Ten God names to canonical English names
                const mapPinyinToCanonical: Record<string, string> = {
                  'Zheng Guan': 'Direct Officer',
                  'Qi Sha': '7 Killings',
                  'Zheng Cai': 'Direct Wealth',
                  'Pian Cai': 'Indirect Wealth',
                  'Zheng Yin': 'Direct Resource',
                  'Pian Yin': 'Indirect Resource',
                  'Shi Shen': 'Eating God',
                  'Shang Guan': 'Hurting Officer',
                  'Bi Jian': 'Friend',
                  'Jie Cai': 'Rob Wealth',
                };
                
                // Use traditional calculation method
                const tenGodPinyin = this.calculateTenGodTraditional(dayMasterStemForLuck, luckPillarStem);
                const tenGodName = mapPinyinToCanonical[tenGodPinyin] || tenGodPinyin;
                
                dailyRawData.luckEra = {
                  tenGod: tenGodName,
                  stemElement: luckPillarStem.elementType as ElementType,
                  stemYinYang: luckPillarStem.yinYang as 'Yin' | 'Yang',
                };
                
                this.logger.log(`✅ Fixed luck era: ${tenGodName} (from ${tenGodPinyin}, ${luckPillarStem.elementType}) for age ${currentAge}, pillar index ${foundPillarIndex}`);
              } catch (error) {
                // If we can't calculate Ten God, leave luckEra as null (Pre-Luck Era)
                this.logger.warn(`Could not calculate Ten God for luck pillar: ${error}`);
                this.logger.warn(`Error stack: ${(error as Error).stack}`);
              }
            } else {
              this.logger.warn(`⚠️ Missing stems for luck era calculation: dayMasterStem=${!!dayMasterStemForLuck}, luckPillarStem=${!!luckPillarStem}`);
            }
          }
        }
      }

      // Calculate scores (pass baseAnalysis for daily pillar Ten God calculation)
      const scores = this.calculateTodayScores(
        dailyRawData,
        userContext,
        dailyAnalysis,
        undefined, // analysisDate
        undefined, // hourPillarElement
        undefined, // hourPillarTenGod
        undefined, // hourPillarBranchElement
        baseAnalysis, // baseAnalysis for daily pillar Ten God
      );
      const baseline = this.calculateBaselineScores(userContext, dailyRawData.luckEra);
      const normalizedScores = this.normalizeScoresRelativeToBaseline(scores, baseline);

      // Get daily element
      const dailyElement = dailyRawData.dailyElement;
      const dailyYinYang = dailyAnalysis.dayPillar?.stemYinYang || 'Yang';
      const dailyElementFormatted = `${dailyElement}-${dailyYinYang === 'Yin' ? 'I' : 'O'}`;

      // Get monthly element
      const monthlyStem = generalAnalysis?.monthPillar?.heavenlyStem;
      const monthlyYinYang = generalAnalysis?.monthPillar?.stemYinYang || 'Yang';
      const monthlyElement = monthlyStem
        ? `${monthlyStem.element}-${monthlyYinYang === 'Yin' ? 'I' : 'O'}`
        : dailyElementFormatted; // Fallback to daily if monthly not available

      // Get daily branch
      const dailyBranch = dailyAnalysis.dayPillar?.branchChar || '';

      // Calculate element relationship
      const isFavorable =
        userContext.favorableElements &&
        (userContext.favorableElements.primary.includes(dailyElement) ||
          userContext.favorableElements.secondary.includes(dailyElement));
      const isUnfavorable =
        userContext.favorableElements &&
        userContext.favorableElements.unfavorable.includes(dailyElement);
      const elementRelationship: 'favorable' | 'unfavorable' | 'neutral' = isFavorable
        ? 'favorable'
        : isUnfavorable
          ? 'unfavorable'
          : 'neutral';

      // Extract active Ten Gods (full extraction like daily forecast)
      const activeTenGods = extractActiveTenGods(userContext, dailyRawData, dailyAnalysis);
      // Store technical names for aggregation
      const tenGodTechnicalNames = activeTenGods.map((tg) => tg.technicalName);

      // Extract special patterns (full extraction like daily forecast)
      const specialPatternsData = this.extractSpecialPatterns(
        dailyRawData,
        dailyAnalysis,
      );

      days.push({
        date: dateString,
        scores: {
          ...normalizedScores,
          rest: 100 - normalizedScores.overall, // Inverse of overall
        },
        dailyElement: dailyElementFormatted,
        dailyBranch,
        monthlyElement,
        elementRelationship,
        activeTenGods: tenGodTechnicalNames, // For backward compatibility
        activeTenGodsFull: activeTenGods, // Full extraction results
        specialPatterns: specialPatternsData.map((p) => p.title), // For backward compatibility
        specialPatternsFull: specialPatternsData, // Full extraction results
        dailyRawData, // Store for potential future use
        dailyAnalysis, // Store for potential future use
      });
    }

    return {
      days,
      userContext,
    };
  }

  /**
   * Calculate scores for today based on traditional BaZi methods
   * Simple, maintainable approach using library data directly
   * Used for daily forecast (includes all factors: daily element, interactions, etc.)
   */
  private calculateTodayScores(
    rawData: RawBaziData,
    userContext: UserContext,
    dailyAnalysis: PersonalizedDailyAnalysisOutput,
    analysisDate?: Date, // Optional: for hourly variation in heatmap
    hourPillarElement?: ElementType | null, // Optional: hour pillar stem element for stronger hourly variation
    hourPillarTenGod?: string | null, // Optional: hour pillar Ten God for additional variation
    hourPillarBranchElement?: ElementType | null, // Optional: hour pillar branch element for more variation
    baseAnalysis?: any, // Optional: base analysis for calculating daily pillar Ten God
  ): {
    overall: number;
    career: number;
    wealth: number;
    relationships: number;
    health: number;
    creativity: number;
  } {
    // Base score starts at 50 (neutral)
    const baseScore = 50;
    let career = baseScore;
    let wealth = baseScore;
    let relationships = baseScore;
    let health = baseScore;
    let creativity = baseScore;

    // 1. Element favorability (reduced weight to allow category-specific factors to differentiate)
    // Traditional BaZi: Element favorability is universal, but we reduce its weight here
    // to allow Ten Gods and other category-specific factors to create meaningful variation
    const elementAdjustment = this.calculateElementFavorability(
      rawData.dailyElement,
      userContext.favorableElements,
    ) * 0.5; // Reduce to 50% (from ±8 to ±4) to allow category-specific factors to dominate
    career += elementAdjustment;
    wealth += elementAdjustment;
    relationships += elementAdjustment;
    health += elementAdjustment;
    creativity += elementAdjustment;

    // 2. Interactions (weighted by pillar importance per category)
    const interactions = dailyAnalysis.interactions || [];
    for (const interaction of interactions) {
      const impact = this.calculateInteractionImpact(interaction);
      if (impact === 0) continue;

      // Apply weighted impact based on which pillars are involved
      const pillarWeights = this.getPillarWeightsForInteraction(interaction);

      career += impact * pillarWeights.career;
      wealth += impact * pillarWeights.wealth;
      relationships += impact * pillarWeights.relationships;
      health += impact * pillarWeights.health;
      creativity += impact * pillarWeights.creativity;
    }

    // 3. Luck Era Ten God (category-specific favorability)
    if (rawData.luckEra?.tenGod) {
      const tenGodAdjustments = this.getTenGodCategoryAdjustments(
        rawData.luckEra.tenGod,
      );
      career += tenGodAdjustments.career;
      wealth += tenGodAdjustments.wealth;
      relationships += tenGodAdjustments.relationships;
      health += tenGodAdjustments.health;
      creativity += tenGodAdjustments.creativity;
    }

    // 3b. Daily Pillar Ten God (category-specific adjustments)
    // Traditional BaZi: The daily pillar's Ten God (relative to Day Master) changes EVERY DAY
    // This creates true daily variation for category-specific scores
    // This is the key to showing different best/worst days per category
    if (baseAnalysis && dailyAnalysis.dayPillar) {
      const dayMasterStem = baseAnalysis.detailedPillars?.day?.heavenlyStem;
      // Daily pillar stem element is available directly from dayPillar
      const dailyPillarStemElement = dailyAnalysis.dayPillar.stemElement;
      const dailyPillarStemYinYang = dailyAnalysis.dayPillar.stemYinYang;
      
      if (dayMasterStem && dailyPillarStemElement && dailyPillarStemYinYang) {
        try {
          // Construct daily pillar stem object matching dayMasterStem structure
          const dailyPillarStem = {
            elementType: dailyPillarStemElement,
            yinYang: dailyPillarStemYinYang,
            value: dayMasterStem.value || 0, // Use dayMasterStem's value as fallback
          };
          
          // Calculate daily pillar Ten God relative to Day Master
          const dailyTenGodPinyin = this.calculateTenGodTraditional(dayMasterStem, dailyPillarStem);
          
          // Map Pinyin to canonical name (same mapping used elsewhere)
          const mapPinyinToCanonical: Record<string, string> = {
            'Zheng Guan': 'Direct Officer',
            'Qi Sha': '7 Killings',
            'Zheng Cai': 'Direct Wealth',
            'Pian Cai': 'Indirect Wealth',
            'Zheng Yin': 'Direct Resource',
            'Pian Yin': 'Indirect Resource',
            'Shi Shen': 'Eating God',
            'Shang Guan': 'Hurting Officer',
            'Bi Jian': 'Friend',
            'Jie Cai': 'Rob Wealth',
          };
          
          // getTenGodCategoryAdjustments expects Pinyin names, not canonical names
          // So use the Pinyin name directly
          const adjustments = this.getTenGodCategoryAdjustments(dailyTenGodPinyin);
          
          // Traditional BaZi: Element favorability is the foundation, Ten Gods work within that context
          // If element is favorable: Ten God benefits are amplified (full strength)
          // If element is unfavorable: Ten God benefits are reduced (opportunities exist but require more effort)
          // If element is neutral: Ten God benefits are at normal strength
          const elementAdjustment = this.calculateElementFavorability(
            rawData.dailyElement,
            userContext.favorableElements,
          );
          
          let elementModifier = 1.0; // Default: normal strength
          if (elementAdjustment > 0) {
            // Favorable element: amplify Ten God benefits (1.5x)
            elementModifier = 1.5;
          } else if (elementAdjustment < 0) {
            // Unfavorable element: reduce Ten God benefits (0.6x - opportunities exist but require effort)
            elementModifier = 0.6;
          }
          // Neutral element: elementModifier stays at 1.0
          
          // Base Ten God weight (strong enough to create category differentiation)
          const baseWeight = 2.5;
          
          // Apply modulated adjustments (Ten God × baseWeight × elementModifier)
          career += adjustments.career * baseWeight * elementModifier;
          wealth += adjustments.wealth * baseWeight * elementModifier;
          relationships += adjustments.relationships * baseWeight * elementModifier;
          health += adjustments.health * baseWeight * elementModifier;
          creativity += adjustments.creativity * baseWeight * elementModifier;
        } catch (error) {
          // If calculation fails, continue without daily Ten God adjustment
          this.logger.warn(`Could not calculate daily pillar Ten God: ${error}`);
        }
      }
    }

    // 4. Special stars (category-specific bonuses)
    // Only count stars that are ACTIVATED today (daily branch matches star's branch)
    const specialStarsBonuses = this.calculateSpecialStarsBonuses(
      rawData,
      dailyAnalysis,
    );
    career += specialStarsBonuses.career;
    wealth += specialStarsBonuses.wealth;
    relationships += specialStarsBonuses.relationships;
    health += specialStarsBonuses.health;
    creativity += specialStarsBonuses.creativity;

    // 5. Hour pillar element favorability (for heatmap hourly differences)
    // Traditional BaZi: Each 2-hour block has a different hour pillar with different element
    // The hour pillar's element favorability creates meaningful variation throughout the day
    if (hourPillarElement && userContext.favorableElements) {
      // Calculate hour pillar element favorability (STRONGER impact than daily element)
      // Hour pillar changes every 2 hours, so it should create significant variation
      const hourElementAdjustment = this.calculateElementFavorability(
        hourPillarElement,
        userContext.favorableElements,
      ) * 1.5; // 1.5x stronger than daily element (was 8, now ±12)
      
      // Hour pillar primarily affects creativity (50%) and health (35%)
      // Also affects other categories but to a lesser degree
      creativity += hourElementAdjustment * 0.5; // Primary impact (was 0.4)
      health += hourElementAdjustment * 0.35; // (was 0.3)
      career += hourElementAdjustment * 0.2; // (was 0.15)
      wealth += hourElementAdjustment * 0.15; // (was 0.1)
      relationships += hourElementAdjustment * 0.1; // (was 0.05)
      
      // 5b. Hour pillar branch element favorability (additional variation)
      // The branch element also affects the hour's energy, creating more differentiation
      if (hourPillarBranchElement && userContext.favorableElements) {
        const hourBranchAdjustment = this.calculateElementFavorability(
          hourPillarBranchElement,
          userContext.favorableElements,
        ) * 0.8; // 0.8x strength (branch is less impactful than stem, but still significant)
        
        // Branch element affects different categories than stem
        health += hourBranchAdjustment * 0.4; // Branch affects health more
        relationships += hourBranchAdjustment * 0.3;
        creativity += hourBranchAdjustment * 0.2;
        career += hourBranchAdjustment * 0.15;
        wealth += hourBranchAdjustment * 0.1;
        
        if (analysisDate) {
          this.logger.log(`  - hourPillarBranchElement: ${hourPillarBranchElement}, branch adjustment: ${hourBranchAdjustment.toFixed(1)}`);
        }
      }
      
      // 5c. Hour pillar Ten God adjustments (additional variation)
      // Different Ten Gods in the hour pillar create different energy patterns
      if (hourPillarTenGod) {
        const hourTenGodAdjustments = this.getTenGodCategoryAdjustments(hourPillarTenGod);
        // Apply at 30% strength (hour pillar is less impactful than luck era, but still significant)
        creativity += hourTenGodAdjustments.creativity * 0.3;
        health += hourTenGodAdjustments.health * 0.3;
        career += hourTenGodAdjustments.career * 0.2;
        wealth += hourTenGodAdjustments.wealth * 0.2;
        relationships += hourTenGodAdjustments.relationships * 0.15;
        
        if (analysisDate) {
          this.logger.log(`  - hourPillarTenGod: ${hourPillarTenGod}, adjustments: c=${hourTenGodAdjustments.career * 0.2}, w=${hourTenGodAdjustments.wealth * 0.2}, h=${hourTenGodAdjustments.health * 0.3}, cr=${hourTenGodAdjustments.creativity * 0.3}`);
        }
      }
    } else if (analysisDate) {
      // Fallback: use hour-based variation if hour pillar not available
      const hour = analysisDate.getHours();
      const hourVariation = Math.sin((hour / 24) * Math.PI * 2) * 5; // Increased from 3.5 to 5
      this.logger.log(`  - Using fallback hour variation (hour=${hour}): ${hourVariation.toFixed(2)}`);
      creativity += hourVariation * 0.8;
      health += hourVariation * 0.6;
      career += hourVariation * 0.3;
      wealth += hourVariation * 0.3;
      relationships += hourVariation * 0.3;
    }

    // Clamp scores to 0-100
    career = Math.max(0, Math.min(100, Math.round(career)));
    wealth = Math.max(0, Math.min(100, Math.round(wealth)));
    relationships = Math.max(0, Math.min(100, Math.round(relationships)));
    health = Math.max(0, Math.min(100, Math.round(health)));
    creativity = Math.max(0, Math.min(100, Math.round(creativity)));

    // Overall is average of all categories
    const overall = Math.round(
      (career + wealth + relationships + health + creativity) / 5,
    );

    return {
      overall,
      career,
      wealth,
      relationships,
      health,
      creativity,
    };
  }

  /**
   * Calculate element favorability adjustment
   * Universal: same adjustment for all categories
   */
  private calculateElementFavorability(
    dailyElement: ElementType,
    favorableElements: UserContext['favorableElements'],
  ): number {
    if (!favorableElements) return 0;

    if (favorableElements.primary.includes(dailyElement)) {
      return 8; // Favorable element day
    }
    if (favorableElements.unfavorable.includes(dailyElement)) {
      return -8; // Unfavorable element day
    }
    return 0; // Neutral
  }

  /**
   * Calculate interaction impact based on type and favorability
   * Traditional BaZi: clashes are more impactful than harmonies
   */
  private calculateInteractionImpact(
    interaction: InteractionDetail,
  ): number {
    const isFavorable = interaction.involvesFavorableElement || false;
    const isUnfavorable = interaction.involvesUnfavorableElement || false;

    if (!isFavorable && !isUnfavorable) return 0;

    // Base impact by interaction type (traditional BaZi emphasis)
    let baseImpact = 0;
    switch (interaction.type) {
      case 'BranchClash': // 地支沖 - most impactful
      case 'StemClash': // 天干沖
        baseImpact = 8;
        break;
      case 'StemCombination': // 天干合
      case 'TrinityCombo': // 三合
        baseImpact = 6;
        break;
      case 'Branch6Combo': // 六合
      case 'DirectionalCombo': // 方合
        baseImpact = 5;
        break;
      case 'BranchHarm': // 地支害
      case 'BranchPunishment': // 地支刑
        baseImpact = 4;
        break;
      default:
        baseImpact = 3; // Other interactions
    }

    // Apply favorability
    if (isFavorable) return baseImpact;
    if (isUnfavorable) return -baseImpact;
    return 0;
  }

  /**
   * Get pillar weights for each category based on which pillars are involved
   * Traditional BaZi: each category has primary/secondary pillars
   *
   * Pillar importance per category:
   * - Career: Month (50%) > Year (20%) > Hour (20%) > Day (10%)
   * - Wealth: Day (35%) = Month (35%) > Year (15%) > Hour (15%)
   * - Relationships: Year (40%) = Day (40%) > Month (10%) > Hour (10%)
   * - Health: Day (70%) > others (10% each)
   * - Creativity: Hour (40%) > Day (30%) > Month (20%) > Year (10%)
   */
  private getPillarWeightsForInteraction(interaction: InteractionDetail): {
    career: number;
    wealth: number;
    relationships: number;
    health: number;
    creativity: number;
  } {
    // Check which pillars are involved
    const hasYear = interaction.participants.some((p) => p.pillar === 'Year');
    const hasMonth = interaction.participants.some((p) => p.pillar === 'Month');
    const hasDay = interaction.participants.some((p) => p.pillar === 'Day');
    const hasHour = interaction.participants.some((p) => p.pillar === 'Hour');

    // Calculate weights based on which pillars are involved
    // If multiple pillars, distribute weights proportionally
    let career = 0;
    let wealth = 0;
    let relationships = 0;
    let health = 0;
    let creativity = 0;

    // Career weights: Month (0.5) > Year (0.2) > Hour (0.2) > Day (0.1)
    if (hasMonth) career += 0.5;
    if (hasYear) career += 0.2;
    if (hasHour) career += 0.2;
    if (hasDay) career += 0.1;

    // Wealth weights: Day (0.35) = Month (0.35) > Year (0.15) > Hour (0.15)
    if (hasDay) wealth += 0.35;
    if (hasMonth) wealth += 0.35;
    if (hasYear) wealth += 0.15;
    if (hasHour) wealth += 0.15;

    // Relationships weights: Year (0.4) = Day (0.4) > Month (0.1) > Hour (0.1)
    if (hasYear) relationships += 0.4;
    if (hasDay) relationships += 0.4;
    if (hasMonth) relationships += 0.1;
    if (hasHour) relationships += 0.1;

    // Health weights: Day (0.7) > others (0.1 each)
    if (hasDay) health += 0.7;
    if (hasYear) health += 0.1;
    if (hasMonth) health += 0.1;
    if (hasHour) health += 0.1;

    // Creativity weights: Hour (0.4) > Day (0.3) > Month (0.2) > Year (0.1)
    if (hasHour) creativity += 0.4;
    if (hasDay) creativity += 0.3;
    if (hasMonth) creativity += 0.2;
    if (hasYear) creativity += 0.1;

    // Normalize to ensure total = 1.0 (distribute impact across categories)
    const total = career + wealth + relationships + health + creativity;
    if (total > 0) {
      const factor = 1.0 / total;
      career *= factor;
      wealth *= factor;
      relationships *= factor;
      health *= factor;
      creativity *= factor;
    } else {
      // If no pillars match, distribute equally
      career = 0.2;
      wealth = 0.2;
      relationships = 0.2;
      health = 0.2;
      creativity = 0.2;
    }

    return { career, wealth, relationships, health, creativity };
  }

  /**
   * Get Ten God adjustments per category
   * Traditional BaZi: Ten Gods have different meanings per category
   */
  private getTenGodCategoryAdjustments(tenGod: string): {
    career: number;
    wealth: number;
    relationships: number;
    health: number;
    creativity: number;
  } {
    // Map library Ten God names (Pinyin) to category-specific adjustments
    const adjustments = {
      career: 0,
      wealth: 0,
      relationships: 0,
      health: 0,
      creativity: 0,
    };

    // Career: Direct Officer (正官) and 7 Killings (七殺) are favorable
    // Zheng Guan = stable authority, Qi Sha = dynamic/aggressive authority
    if (tenGod === 'Zheng Guan') {
      adjustments.career = 6;
      adjustments.relationships = -4; // Stable but formal
    } else if (tenGod === 'Qi Sha') {
      adjustments.career = 7; // Slightly more dynamic
      adjustments.relationships = -5; // More challenging in relationships
    }
    // Career: Eating God (食神) and Hurting Officer (傷官) are challenging
    // Shi Shen = gentle output, Shang Guan = rebellious output
    else if (tenGod === 'Shi Shen') {
      adjustments.career = -4;
      adjustments.creativity = 6;
    } else if (tenGod === 'Shang Guan') {
      adjustments.career = -5; // More challenging
      adjustments.creativity = 7; // More creative
    }

    // Wealth: Direct Wealth (正財) and Indirect Wealth (偏財) are favorable
    // Zheng Cai = stable income, Pian Cai = speculative/opportunistic
    if (tenGod === 'Zheng Cai') {
      adjustments.wealth = 6;
      adjustments.health = -4;
    } else if (tenGod === 'Pian Cai') {
      adjustments.wealth = 7; // Slightly more dynamic
      adjustments.health = -5; // More draining
    }
    // Wealth: Rob Wealth (劫財) and Friend (比肩) are challenging
    // Jie Cai = competitive, Bi Jian = supportive
    else if (tenGod === 'Jie Cai') {
      adjustments.wealth = -4;
      adjustments.health = 5;
    } else if (tenGod === 'Bi Jian') {
      adjustments.wealth = -4;
      adjustments.health = 6; // More supportive
    }

    // Relationships: Direct Resource (正印) and Indirect Resource (偏印) are favorable
    // Zheng Yin = traditional learning, Pian Yin = unconventional knowledge
    if (tenGod === 'Zheng Yin') {
      adjustments.relationships = 6;
      adjustments.creativity = -4;
    } else if (tenGod === 'Pian Yin') {
      adjustments.relationships = 7; // More dynamic
      adjustments.creativity = -3; // Less restrictive on creativity
    }

    return adjustments;
  }

  /**
   * Calculate special stars bonuses per category
   * Traditional BaZi: each star benefits different life areas
   *
   * IMPORTANT: Special stars are always present in natal chart, but only ACTIVATED
   * when today's daily branch matches the star's branch
   */
  private calculateSpecialStarsBonuses(
    rawData: RawBaziData,
    dailyAnalysis: PersonalizedDailyAnalysisOutput,
  ): {
    career: number;
    wealth: number;
    relationships: number;
    health: number;
    creativity: number;
  } {
    const bonuses = {
      career: 0,
      wealth: 0,
      relationships: 0,
      health: 0,
      creativity: 0,
    };

    if (!rawData.specialStars) return bonuses;

    // Get today's daily branch character (e.g., "子", "丑", "寅")
    const todayBranch = dailyAnalysis.dayPillar.branchChar;
    if (!todayBranch) return bonuses;

    // Check which special stars are ACTIVATED today (daily branch matches star's branch)

    // Nobleman (天乙贵人) - helpers/supporters
    // Activated when today's branch matches any of the nobleman branches in natal chart
    if (
      rawData.specialStars.nobleman?.some((branch) => branch === todayBranch)
    ) {
      bonuses.career += 3;
      bonuses.relationships += 4; // Nobleman helps relationships (influential people)
      bonuses.wealth += 1; // Social connections help wealth
    }

    // Intelligence (文昌星) - academic/learning success
    // Activated when today's branch matches the intelligence branch in natal chart
    if (rawData.specialStars.intelligence === todayBranch) {
      bonuses.creativity += 4;
      bonuses.career += 2;
    }

    // Sky Horse (驿马星) - movement/travel/change
    // Activated when today's branch matches the sky horse branch in natal chart
    if (rawData.specialStars.skyHorse === todayBranch) {
      bonuses.career += 3;
      bonuses.creativity += 3;
    }

    // Peach Blossom (桃花星) - relationships/charisma
    // Activated when today's branch matches the peach blossom branch in natal chart
    if (rawData.specialStars.peachBlossom === todayBranch) {
      bonuses.relationships += 4; // Peach Blossom strongly benefits relationships
      bonuses.creativity += 2;
      bonuses.health += 2;
    }

    return bonuses;
  }

  /**
   * Calculate Ten God using traditional BaZi rules
   * Used as fallback when library's calculateTenGod returns null
   * 
   * The library returns null when:
   * 1. Same stem value (handled separately)
   * 2. No relationship found (shouldn't happen for valid elements, but we handle it)
   * 
   * Traditional BaZi Ten God calculation (matches library logic):
   * - Same element: Bi Jian (same Yin/Yang) or Jie Cai (different Yin/Yang)
   * - Other produces Day Master: Zheng Yin (different) or Pian Yin (same)
   * - Other controls Day Master: Zheng Guan (different) or Qi Sha (same)
   * - Day Master produces other: Shi Shen (different) or Shang Guan (same)
   * - Day Master controls other: Zheng Cai (different) or Pian Cai (same)
   */
  private calculateTenGodTraditional(
    dayMasterStem: { elementType: string; yinYang: string; value: number },
    otherStem: { elementType: string; yinYang: string; value: number },
  ): string {
    // Same element = Companion relationship
    if (dayMasterStem.elementType === otherStem.elementType) {
      return dayMasterStem.yinYang === otherStem.yinYang ? 'Bi Jian' : 'Jie Cai';
    }

    // Element cycle: Wood → Fire → Earth → Metal → Water → Wood
    const elementCycle: Record<string, string> = {
      WOOD: 'FIRE',
      FIRE: 'EARTH',
      EARTH: 'METAL',
      METAL: 'WATER',
      WATER: 'WOOD',
    };

    // Control cycle: Wood controls Earth, Earth controls Water, Water controls Fire, Fire controls Metal, Metal controls Wood
    const controlCycle: Record<string, string> = {
      WOOD: 'EARTH',
      EARTH: 'WATER',
      WATER: 'FIRE',
      FIRE: 'METAL',
      METAL: 'WOOD',
    };

    const sameYinYang = dayMasterStem.yinYang === otherStem.yinYang;

    // Check if other stem produces Day Master
    if (elementCycle[otherStem.elementType] === dayMasterStem.elementType) {
      return sameYinYang ? 'Pian Yin' : 'Zheng Yin';
    }

    // Check if other stem controls Day Master
    if (controlCycle[otherStem.elementType] === dayMasterStem.elementType) {
      return sameYinYang ? 'Qi Sha' : 'Zheng Guan';
    }

    // Check if Day Master produces other stem
    if (elementCycle[dayMasterStem.elementType] === otherStem.elementType) {
      return sameYinYang ? 'Shang Guan' : 'Shi Shen';
    }

    // Check if Day Master controls other stem
    if (controlCycle[dayMasterStem.elementType] === otherStem.elementType) {
      return sameYinYang ? 'Pian Cai' : 'Zheng Cai';
    }

    // Fallback (shouldn't happen, but safety)
    return 'Bi Jian';
  }

  /**
   * Calculate rarity for TrinityCombo based on ACTUAL trinity combo detected today
   * Trinity groups: 申子辰 (Water), 寅午戌 (Fire), 亥卯未 (Wood), 巳酉丑 (Metal)
   * 
   * IMPORTANT: Rarity is based on how often the specific missing branch appears
   * in daily/monthly/annual pillars, not theoretical probability.
   */
  private calculateTrinityComboRarity(
    natalBranches: string[],
    trinityCombo?: { participants?: Array<{ branch?: string; source?: string; pillar?: string }> },
  ): string {
    const trinityGroups = [
      ['申', '子', '辰'], // Shen-Zi-Chen (Water)
      ['寅', '午', '戌'], // Yin-Wu-Xu (Fire)
      ['亥', '卯', '未'], // Hai-Mao-Wei (Wood)
      ['巳', '酉', '丑'], // Si-You-Chou (Metal)
    ];

    // If we have the actual trinity combo, calculate based on what actually happened
    if (trinityCombo?.participants) {
      const participantBranches = trinityCombo.participants
        .map(p => p.branch)
        .filter(Boolean) as string[];
      
      // Find which trinity group this belongs to
      const matchingGroup = trinityGroups.find(group => 
        participantBranches.every(branch => group.includes(branch)) &&
        participantBranches.length >= 3
      );

      if (matchingGroup) {
        // Count how many branches came from natal vs transit
        const natalCount = trinityCombo.participants.filter(
          p => p.source === 'Natal'
        ).length;
        const transitParticipants = trinityCombo.participants.filter(
          p => p.source === 'Daily' || p.source === 'Monthly' || p.source === 'Annual'
        );
        const transitCount = transitParticipants.length;

        this.logger.log(`🔍 TrinityCombo Rarity Debug: Actual trinity detected with ${natalCount} natal + ${transitCount} transit branches`);
        
        // Determine which transit pillar(s) complete the trinity
        const hasDaily = transitParticipants.some(p => p.source === 'Daily');
        const hasMonthly = transitParticipants.some(p => p.source === 'Monthly');
        const hasAnnual = transitParticipants.some(p => p.source === 'Annual');
        
        this.logger.log(`🔍 TrinityCombo Rarity Debug: Transit sources - Daily: ${hasDaily}, Monthly: ${hasMonthly}, Annual: ${hasAnnual}`);

        // Calculate rarity based on which pillar completes it:
        // - Daily pillar: cycles every 12 days → "1 in 12 days"
        // - Monthly pillar: cycles every 12 months (~365 days) → "1 in 12 months" ≈ "1 in 365 days"
        // - Annual pillar: cycles every 12 years (~4380 days) → "1 in 12 years" ≈ "1 in 4380 days"
        // If multiple pillars complete it, use the most frequent (daily)
        
        if (hasDaily) {
          // Daily pillar completes it - most frequent
          return '1 in 12 days';
        } else if (hasMonthly) {
          // Monthly pillar completes it - rarer
          return '1 in 12 months';
        } else if (hasAnnual) {
          // Annual pillar completes it - very rare
          return '1 in 12 years';
        } else {
          // Fallback (shouldn't happen if transitCount > 0)
          return '1 in 12 days';
        }
      }
    }

    // Fallback: theoretical calculation based on natal chart
    // Count how many trinity groups the user can complete (has 2 branches from)
    let completableGroups = 0;
    const groupDetails: string[] = [];
    
    for (let i = 0; i < trinityGroups.length; i++) {
      const group = trinityGroups[i];
      const userBranchesInGroup = group.filter((branch) =>
        natalBranches.includes(branch),
      );
      const groupName = ['Water', 'Fire', 'Wood', 'Metal'][i];
      groupDetails.push(`${groupName} trinity: user has ${userBranchesInGroup.length}/3 branches (${userBranchesInGroup.join(', ') || 'none'})`);
      
      if (userBranchesInGroup.length >= 2) {
        completableGroups++;
      }
    }

    this.logger.log(`🔍 TrinityCombo Rarity Debug: ${groupDetails.join('; ')}`);
    this.logger.log(`🔍 TrinityCombo Rarity Debug: Completable groups: ${completableGroups}`);

    if (completableGroups === 0) {
      this.logger.log(`🔍 TrinityCombo Rarity Debug: User can't form trinity - returning 'Never'`);
      return 'Never'; // User can't form trinity
    }

    // Theoretical: Each completable group has 1 branch that completes it
    // The missing branch appears in daily pillar 1 in 12 days
    // But we also have monthly (1 in 12 months) and annual (1 in 12 years) chances
    // For daily forecast, we use the most frequent: 1 in 12 days
    const daysPerOccurrence = Math.round(12 / completableGroups);
    const rarity = `1 in ${daysPerOccurrence} days`;
    this.logger.log(`🔍 TrinityCombo Rarity Debug: Calculated rarity (theoretical): ${rarity}`);
    return rarity;
  }

  /**
   * Calculate rarity for DirectionalCombo based on ACTUAL combo detected today
   * Directional groups: 寅卯辰巳 (East), 申酉戌亥 (West), 巳午未申 (South), 亥子丑寅 (North)
   * 
   * IMPORTANT: Rarity is based on how often the specific missing branch appears
   * in daily/monthly/annual pillars, not theoretical probability.
   */
  private calculateDirectionalComboRarity(
    natalBranches: string[],
    directionalCombo?: { participants?: Array<{ branch?: string; source?: string; pillar?: string }> },
  ): string {
    const directionalGroups = [
      ['寅', '卯', '辰', '巳'], // East
      ['申', '酉', '戌', '亥'], // West
      ['巳', '午', '未', '申'], // South
      ['亥', '子', '丑', '寅'], // North
    ];

    // If we have the actual directional combo, calculate based on what actually happened
    if (directionalCombo?.participants) {
      const participantBranches = directionalCombo.participants
        .map(p => p.branch)
        .filter(Boolean) as string[];
      
      // Find which directional group this belongs to
      const matchingGroup = directionalGroups.find(group => 
        participantBranches.every(branch => group.includes(branch)) &&
        participantBranches.length >= 4
      );

      if (matchingGroup) {
        // Count how many branches came from natal vs transit
        const natalCount = directionalCombo.participants.filter(
          p => p.source === 'Natal'
        ).length;
        const transitParticipants = directionalCombo.participants.filter(
          p => p.source === 'Daily' || p.source === 'Monthly' || p.source === 'Annual'
        );
        const transitCount = transitParticipants.length;

        this.logger.log(`🔍 DirectionalCombo Rarity Debug: Actual combo detected with ${natalCount} natal + ${transitCount} transit branches`);
        
        // Determine which transit pillar(s) complete the combo
        const hasDaily = transitParticipants.some(p => p.source === 'Daily');
        const hasMonthly = transitParticipants.some(p => p.source === 'Monthly');
        const hasAnnual = transitParticipants.some(p => p.source === 'Annual');
        
        this.logger.log(`🔍 DirectionalCombo Rarity Debug: Transit sources - Daily: ${hasDaily}, Monthly: ${hasMonthly}, Annual: ${hasAnnual}`);

        // Calculate rarity based on which pillar completes it:
        // - Daily pillar: cycles every 12 days → "1 in 12 days"
        // - Monthly pillar: cycles every 12 months (~365 days) → "1 in 12 months"
        // - Annual pillar: cycles every 12 years (~4380 days) → "1 in 12 years"
        // If multiple pillars complete it, use the most frequent (daily)
        
        if (hasDaily) {
          return '1 in 12 days';
        } else if (hasMonthly) {
          return '1 in 12 months';
        } else if (hasAnnual) {
          return '1 in 12 years';
        } else {
          // Fallback (shouldn't happen if transitCount > 0)
          return '1 in 12 days';
        }
      }
    }

    // Fallback: theoretical calculation based on natal chart
    // Count how many directional groups the user can complete (has 3 branches from)
    let completableGroups = 0;
    for (const group of directionalGroups) {
      const userBranchesInGroup = group.filter((branch) =>
        natalBranches.includes(branch),
      );
      if (userBranchesInGroup.length >= 3) {
        completableGroups++;
      }
    }

    if (completableGroups === 0) {
      return 'Never'; // User can't form directional combo
    }

    // Theoretical: Each completable group has 1 branch that completes it
    // The missing branch appears in daily pillar 1 in 12 days
    // But we also have monthly (1 in 12 months) and annual (1 in 12 years) chances
    // For daily forecast, we use the most frequent: 1 in 12 days
    const daysPerOccurrence = Math.round(12 / completableGroups);
    return `1 in ${daysPerOccurrence} days`;
  }

  /**
   * Extract special patterns and star activations for today
   * Returns patterns with title, description, rarity, and emoji
   */
  extractSpecialPatterns(
    rawData: RawBaziData,
    dailyAnalysis: PersonalizedDailyAnalysisOutput,
  ): Array<{
    title: string;
    description: string;
    rarity: string;
    emoji: string;
  }> {
    const patterns: Array<{
      title: string;
      description: string;
      rarity: string;
      emoji: string;
    }> = [];

    if (!rawData.specialStars || !dailyAnalysis.dayPillar?.branchChar) {
      return patterns;
    }

    const todayBranch = dailyAnalysis.dayPillar.branchChar;

    // Get natal branches for rarity calculations
    const natalBranches = [
      rawData.natalStructure.social.branch,
      rawData.natalStructure.career.branch,
      rawData.natalStructure.personal.branch,
      rawData.natalStructure.innovation?.branch,
    ].filter((b): b is string => b !== null && b !== undefined);

    // 1. Special Stars Activations (when today's branch matches star's branch)
    // These stars are always present in natal chart, but only ACTIVE when branch matches
    // NOTE: todayBranch comes from dailyAnalysis.dayPillar.branchChar (daily pillar)
    // Daily pillar cycles every 12 days, so "1 in 12 days" is accurate for single-branch stars
    // For Nobleman (can have multiple branches), rarity = 12 / branchCount

    // Nobleman (天乙贵人) - can have multiple branches
    // Note: This star is always present in your natal chart, but only ACTIVE when today's branch matches
    if (rawData.specialStars.nobleman?.includes(todayBranch)) {
      const branchCount = rawData.specialStars.nobleman.length;
      // If user has multiple Nobleman branches, activation is more frequent
      const rarity = branchCount > 0 ? `1 in ${Math.round(12 / branchCount)} days` : '1 in 12 days';
      patterns.push({
        title: 'Noble Person Star Active',
        description:
          'Your Noble Person star (always present in your chart) is activated today. Expect helpful people, mentors, or influential supporters to appear. This is an excellent day for networking, seeking guidance, or connecting with authority figures.',
        rarity,
        emoji: '👑',
      });
    }

    // Intelligence (文昌星)
    // Note: This star is always present in your natal chart, but only ACTIVE when today's branch matches
    if (rawData.specialStars.intelligence === todayBranch) {
      patterns.push({
        title: 'Academic Star Active',
        description:
          'Your Academic Star (always present in your chart) is activated today. This is an ideal day for learning, studying, writing, or intellectual pursuits. Your memory and comprehension are enhanced, making it perfect for exams, presentations, or complex problem-solving.',
        rarity: '1 in 12 days',
        emoji: '📚',
      });
    }

    // Sky Horse (驿马星)
    // Note: This star is always present in your natal chart, but only ACTIVE when today's branch matches
    if (rawData.specialStars.skyHorse === todayBranch) {
      patterns.push({
        title: 'Travel Destiny Star Active',
        description:
          'Your Travel Destiny star (always present in your chart) is activated today. Movement, change, and exploration are favored. This could manifest as travel, relocation, career changes, or simply embracing new environments. Avoid staying stagnant—action and movement bring opportunities.',
        rarity: '1 in 12 days',
        emoji: '🏇',
      });
    }

    // Peach Blossom (桃花星)
    // Note: This star is always present in your natal chart, but only ACTIVE when today's branch matches
    if (rawData.specialStars.peachBlossom === todayBranch) {
      patterns.push({
        title: 'Romance Magnetism Star Active',
        description:
          'Your Romance Magnetism star (always present in your chart) is activated today. Your charisma and social appeal are heightened, making this an excellent day for relationships, social events, or careers requiring charm. People are naturally drawn to you today.',
        rarity: '1 in 12 days',
        emoji: '🌸',
      });
    }

    // 2. Rare Interaction Patterns
    // Only show truly rare patterns - common interactions (Branch6Combo, StemCombination, BranchClash, StemClash)
    // happen too frequently (multiple times per month) to be considered "special patterns"
    const allInteractions = dailyAnalysis.interactions || [];

    // CRITICAL: Filter to only interactions involving TODAY's energy (Daily, Monthly, Annual)
    // Natal-Natal interactions are permanent patterns, not "special for today"
    // For special patterns, we only care about interactions that involve today's transit energy
    const todayInteractions = allInteractions.filter((int) => {
      const hasTransitParticipant = int.participants?.some(
        (p) => p.source === 'Daily' || p.source === 'Monthly' || p.source === 'Annual',
      );
      return hasTransitParticipant;
    });

    // Debug: Log all interaction types
    const allInteractionTypes = allInteractions.map(int => int.type);
    const todayInteractionTypes = todayInteractions.map(int => int.type);
    this.logger.log(`🔍 Special Patterns Debug: Found ${allInteractions.length} total interactions: ${allInteractionTypes.join(', ')}`);
    this.logger.log(`🔍 Special Patterns Debug: Filtered to ${todayInteractions.length} interactions involving today's energy: ${todayInteractionTypes.join(', ')}`);
    this.logger.log(`🔍 Special Patterns Debug: Natal branches: ${natalBranches.join(', ')}`);
    this.logger.log(`🔍 Special Patterns Debug: Today's branch: ${todayBranch}`);

    // TrinityCombo (三合) - Very rare, requires 3 specific branches
    // IMPORTANT: A true TrinityCombo requires exactly 3 branches from the same trinity group
    // AND must involve today's energy (not just natal-natal)
    const trinityCombos = todayInteractions.filter((int) => int.type === 'TrinityCombo');
    
    // Find a valid TrinityCombo (must have 3+ participants to form a true trinity)
    const validTrinityCombo = trinityCombos.find((int) => {
      const participantCount = int.participants?.length || 0;
      // A true TrinityCombo needs at least 3 branches (can be natal + transit combinations)
      return participantCount >= 3;
    });
    
    if (trinityCombos.length > 0) {
      this.logger.log(`🔍 Special Patterns Debug: Found ${trinityCombos.length} TrinityCombo interactions involving today's energy`);
      trinityCombos.forEach((tc, idx) => {
        const participants = tc.participants?.map(p => `${p.pillar}(${p.source})`) || [];
        this.logger.log(`🔍 Special Patterns Debug: TrinityCombo ${idx + 1}: ${participants.length} participants - ${participants.join(', ')}`);
      });
    }
    
    if (validTrinityCombo) {
      this.logger.log(`🔍 Special Patterns Debug: Valid TrinityCombo found with ${validTrinityCombo.participants?.length} participants`);
      // Pass the actual trinity combo to calculate accurate rarity
      const rarity = this.calculateTrinityComboRarity(natalBranches, validTrinityCombo);
      this.logger.log(`🔍 Special Patterns Debug: Calculated rarity: ${rarity}`);
      if (rarity !== 'Never') {
        patterns.push({
          title: 'Trinity Harmony Day',
          description:
            'Three powerful forces align today, creating exceptional synergy and transformation. This rare cosmic pattern brings unified strength and elemental harmony. Major opportunities for breakthrough and significant progress.',
          rarity,
          emoji: '✨',
        });
      } else {
        this.logger.warn(`⚠️ Valid TrinityCombo detected but rarity is 'Never' - this shouldn't happen!`);
      }
    } else if (trinityCombos.length > 0) {
      this.logger.warn(`⚠️ Found ${trinityCombos.length} TrinityCombo interactions involving today, but none have 3+ participants. These are likely false positives (partial trinities).`);
    } else {
      this.logger.log(`🔍 Special Patterns Debug: No TrinityCombo found in interactions involving today's energy`);
    }

    // DirectionalCombo (方合) - Rare, seasonal alignment
    // Only consider interactions involving today's energy
    // IMPORTANT: A true DirectionalCombo requires exactly 4 branches from the same directional group
    const directionalCombos = todayInteractions.filter((int) => int.type === 'DirectionalCombo');
    
    // Find a valid DirectionalCombo (must have 4+ participants to form a true directional combo)
    const validDirectionalCombo = directionalCombos.find((int) => {
      const participantCount = int.participants?.length || 0;
      // A true DirectionalCombo needs at least 4 branches (can be natal + transit combinations)
      return participantCount >= 4;
    });
    
    if (directionalCombos.length > 0) {
      this.logger.log(`🔍 Special Patterns Debug: Found ${directionalCombos.length} DirectionalCombo interactions involving today's energy`);
      directionalCombos.forEach((dc, idx) => {
        const participants = dc.participants?.map(p => `${p.pillar}(${p.source})`) || [];
        this.logger.log(`🔍 Special Patterns Debug: DirectionalCombo ${idx + 1}: ${participants.length} participants - ${participants.join(', ')}`);
      });
    }
    
    if (validDirectionalCombo) {
      this.logger.log(`🔍 Special Patterns Debug: Valid DirectionalCombo found with ${validDirectionalCombo.participants?.length} participants`);
      // Pass the actual directional combo to calculate accurate rarity
      const rarity = this.calculateDirectionalComboRarity(natalBranches, validDirectionalCombo);
      this.logger.log(`🔍 Special Patterns Debug: Calculated rarity: ${rarity}`);
      if (rarity !== 'Never') {
        patterns.push({
          title: 'Seasonal Alignment Day',
          description:
            'The four directions align today, bringing environmental support and natural flow. This rare pattern indicates favorable timing and alignment with cosmic rhythms. Trust the natural flow and timing of events.',
          rarity,
          emoji: '🌐',
        });
      }
    } else if (directionalCombos.length > 0) {
      this.logger.warn(`⚠️ Found ${directionalCombos.length} DirectionalCombo interactions involving today, but none have 4+ participants. These are likely false positives (partial combos).`);
    }

    // 3. Multiple Simultaneous Activations (rare combinations)

    // Count activated special stars
    const activatedStarsCount =
      (rawData.specialStars.nobleman?.includes(todayBranch) ? 1 : 0) +
      (rawData.specialStars.intelligence === todayBranch ? 1 : 0) +
      (rawData.specialStars.skyHorse === todayBranch ? 1 : 0) +
      (rawData.specialStars.peachBlossom === todayBranch ? 1 : 0);

    // Multiple special stars activated (truly rare)
    if (activatedStarsCount >= 2) {
      // Calculate: if 2 stars activate, probability = (star1_rarity) * (star2_rarity)
      // Each star is 1 in 12 days, so 2 stars = 1 in 144 days
      // 3 stars = 1 in 1728 days, 4 stars = 1 in 20736 days
      const daysPerOccurrence =
        activatedStarsCount === 2
          ? 144
          : activatedStarsCount === 3
            ? 1728
            : 20736;
      const rarityText =
        daysPerOccurrence >= 365
          ? `1 in ${Math.round(daysPerOccurrence / 365)} years`
          : `1 in ${daysPerOccurrence} days`;
      patterns.push({
        title: 'Double Star Activation',
        description:
          'Multiple special stars are activated simultaneously today, amplifying their combined influence. This rare alignment creates exceptional opportunities. The combined power of these stars makes this a particularly significant day.',
        rarity: rarityText,
        emoji: '⭐',
      });
    }

    // Special star + rare interaction combination (extremely rare)
    // Use validTrinityCombo or validDirectionalCombo (already filtered)
    if (activatedStarsCount >= 1 && (validTrinityCombo || validDirectionalCombo)) {
      const interactionRarity = validTrinityCombo
        ? this.calculateTrinityComboRarity(natalBranches, validTrinityCombo)
        : validDirectionalCombo
          ? this.calculateDirectionalComboRarity(natalBranches, validDirectionalCombo)
          : null;

      if (interactionRarity && interactionRarity !== 'Never') {
        // Extract days from interaction rarity (e.g., "1 in 12 days" -> 12)
        const interactionDays = parseInt(interactionRarity.match(/\d+/)?.[0] || '12');
        // Star activation is 1 in 12 days
        const combinedDays = 12 * interactionDays;
        const rarityText =
          combinedDays >= 365
            ? `1 in ${Math.round(combinedDays / 365)} years`
            : `1 in ${combinedDays} days`;
        patterns.push({
          title: 'Cosmic Convergence',
          description:
            'A special star activates alongside a rare cosmic pattern today, creating an exceptional alignment. This combination is extremely rare and indicates a day of significant potential. Major opportunities or transformations may occur.',
          rarity: rarityText,
          emoji: '🌟',
        });
      }
    }
    
    // Debug: Log final patterns
    this.logger.log(`🔍 Special Patterns Debug: Final patterns count: ${patterns.length}`);
    patterns.forEach((p, idx) => {
      this.logger.log(`🔍 Special Patterns Debug: Pattern ${idx + 1}: ${p.title} (${p.rarity})`);
    });

    // Sort by rarity (most rare first) - parse rarity strings to compare
    patterns.sort((a, b) => {
      const aDays = this.parseRarityToDays(a.rarity);
      const bDays = this.parseRarityToDays(b.rarity);
      return aDays - bDays; // Lower days = more rare
    });

    // Limit to top 3 most significant patterns (or all if less than 3)
    return patterns.slice(0, 3);
  }

  /**
   * Parse rarity string to days for sorting
   * "1 in 12 days" -> 12
   * "1 in 2 years" -> 730
   */
  private parseRarityToDays(rarity: string): number {
    const daysMatch = rarity.match(/1 in (\d+) days/);
    if (daysMatch) {
      return parseInt(daysMatch[1]);
    }
    const yearsMatch = rarity.match(/1 in (\d+) years/);
    if (yearsMatch) {
      return parseInt(yearsMatch[1]) * 365;
    }
    return 999999; // Unknown rarity = least rare
  }
}
