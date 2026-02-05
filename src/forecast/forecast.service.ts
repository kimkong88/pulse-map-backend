import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { toDate, formatInTimeZone } from 'date-fns-tz';
import { differenceInYears, addDays } from 'date-fns';
import { generateText, Output } from 'ai';
import { z } from 'zod';
import { SajuService } from '../saju/saju.service';
import { geminiClient } from '../utils/ai';
import * as usersRepository from '../repositories/users.repository';
import { buildSystemPrompt, buildUserPrompt } from './prompts';
import { extractActiveTenGods, ActiveTenGod } from './utils/activeTenGods.util';
import { getElementRelationshipMeaning } from './utils/elementRelationship.util';
import { getElementEmoji } from './utils/elementEmojis.config';
import { getBranchAnimal, getBranchEmoji, getBranchMeaning } from './utils/branchAnimals.config';
import { getTenGodDisplayName, getTenGodEmoji, getTenGodCategory } from './utils/tenGodDisplay.config';
import { Forecast14Day } from './forecast-14day.interface';
import { UserContext } from '../saju/types';
import {
  phaseAnalysisSystemPrompt,
  phaseAnalysisSchema,
} from './prompts/14day-phase-prompt';

export interface TodayForecast {
  // Element relationship
  elementRelationship: {
    myElement: string; // e.g., "FIRE-I" (Day Master)
    myElementEmoji: string; // e.g., "🔥"
    todayElement: string; // e.g., "WOOD-O" (Daily element)
    todayElementEmoji: string; // e.g., "🌳"
    meaning: string; // Friendly, clear explanation
  };

  // Daily branch (animal) - same for everyone on the same day
  dailyBranch: {
    character: string; // e.g., "午" (branch character)
    animal: string; // e.g., "Horse" (animal name)
    emoji: string; // e.g., "🐴" (animal emoji)
    meaning: string; // Simple, friendly meaning
  };

  // Active Ten Gods
  activeTenGods: ActiveTenGod[];

  // LLM-generated content
  reading: {
    paragraphs: string[]; // Array of paragraphs for the daily reading
    technicalBasis: string[]; // Array of technical explanations
  };
  theme: string; // e.g., "Day of Focus" (must start with "Day of")
  subheading: string; // e.g., "Channel your energy into meaningful work"
  goodThings: Array<{
    title: string;
    description: string;
    emoji: string;
    howToMaximize: string; // How to maximize this opportunity
    technicalBasis: string[]; // Array of technical explanations
  }>;
  challenges: Array<{
    title: string;
    description: string;
    emoji: string;
    whatToDo: string;
    technicalBasis: string[]; // Array of technical explanations
  }>;
  specialPatterns: Array<{
    title: string;
    description: string;
    rarity: string; // e.g., "1 in 12 days"
    emoji: string;
  }>;
}

@Injectable()
export class ForecastService {
  private readonly logger = new Logger(ForecastService.name);

  constructor(private readonly sajuService: SajuService) {}

  /**
   * Get today's forecast based on user's current timezone
   */
  async getTodayForecast(userId: string): Promise<TodayForecast> {
    // Fetch user data
    const user = await usersRepository.findById(userId);
    if (!user) {
      throw new NotFoundException('user_not_found');
    }

    // Convert stored date to proper timezone-aware Date object
    // The DB stores as UTC, but we need to interpret it as local time in the birth timezone
    const birthDateString = user.birthDate.toISOString().split('.')[0]; // Remove milliseconds and Z
    const birthDateTime = toDate(birthDateString, { timeZone: user.birthTimezone });

    // Get current timezone (fallback to birthTimezone if not set)
    const currentTimezone = user.currentTimezone || user.birthTimezone;

    // Get today's date in user's current timezone
    const today = new Date();
    const todayInTimezone = toDate(
      formatInTimeZone(today, currentTimezone, 'yyyy-MM-dd'),
      { timeZone: currentTimezone },
    );

    // Get full BaZi data from SajuService (userContext, dailyRawData, dailyAnalysis)
    const forecastData = await this.sajuService.getTodayForecastData(
      birthDateTime,
      user.gender as 'male' | 'female',
      user.birthTimezone,
      user.isTimeKnown,
      todayInTimezone,
      currentTimezone,
    );

    // Calculate age for personalized context
    const age = differenceInYears(todayInTimezone, birthDateTime);

    // Generate LLM content (reading, theme, subheading, goodThings, challenges)
    const llmContent = await this.generateLLMContent(
      forecastData.userContext,
      forecastData.dailyRawData,
      forecastData.dailyAnalysis,
      todayInTimezone,
      currentTimezone,
      {
        age,
        gender: user.gender as 'male' | 'female',
        birthLocation: user.birthLocation,
        currentLocation: user.currentLocation,
      },
    );

    // Extract special patterns and star activations
    const specialPatterns = this.sajuService.extractSpecialPatterns(
      forecastData.dailyRawData,
      forecastData.dailyAnalysis,
    );

    // Extract active Ten Gods
    const activeTenGods = extractActiveTenGods(
      forecastData.userContext,
      forecastData.dailyRawData,
      forecastData.dailyAnalysis,
    );

    // Generate element relationship meaning
    const dayMaster = forecastData.userContext.natalStructure.personal;
    const dayMasterElement = `${dayMaster.element}-${dayMaster.yinYang === 'Yin' ? 'I' : 'O'}`;
    const dailyElement = forecastData.dailyRawData.dailyElement;
    const dailyYinYang = forecastData.dailyAnalysis.dayPillar?.stemYinYang || 'Yang';
    const dailyElementFormatted = `${dailyElement}-${dailyYinYang === 'Yin' ? 'I' : 'O'}`;
    
    const elementRelationshipMeaning = getElementRelationshipMeaning(
      dayMaster.element,
      dayMaster.yinYang,
      dailyElement,
      dailyYinYang,
      forecastData.userContext.favorableElements,
    );

    // Extract daily branch (animal) - same for everyone on the same day
    const dailyBranchChar = forecastData.dailyAnalysis.dayPillar?.branchChar;
    const dailyBranchAnimal = dailyBranchChar ? getBranchAnimal(dailyBranchChar) : null;
    const dailyBranchEmoji = dailyBranchChar ? getBranchEmoji(dailyBranchChar) : '✨';
    const dailyBranchMeaning = dailyBranchChar ? getBranchMeaning(dailyBranchChar) : 'Today\'s energy brings unique opportunities.';

    return {
      elementRelationship: {
        myElement: dayMasterElement,
        myElementEmoji: getElementEmoji(dayMaster.element),
        todayElement: dailyElementFormatted,
        todayElementEmoji: getElementEmoji(dailyElement),
        meaning: elementRelationshipMeaning,
      },
      dailyBranch: {
        character: dailyBranchChar || '',
        animal: dailyBranchAnimal || 'Unknown',
        emoji: dailyBranchEmoji,
        meaning: dailyBranchMeaning || 'Today\'s energy brings unique opportunities.',
      },
      activeTenGods,
      ...llmContent,
      specialPatterns,
    };
  }

  /**
   * Get forecast for a specific date (used by reports)
   */
  async getForecastForDate(
    userId: string,
    targetDate: Date,
  ): Promise<TodayForecast> {
    // Fetch user data
    const user = await usersRepository.findById(userId);
    if (!user) {
      throw new NotFoundException('user_not_found');
    }

    // Convert stored date to proper timezone-aware Date object
    const birthDateString = user.birthDate.toISOString().split('.')[0];
    const birthDateTime = toDate(birthDateString, {
      timeZone: user.birthTimezone,
    });

    // Get current timezone (fallback to birthTimezone if not set)
    const currentTimezone = user.currentTimezone || user.birthTimezone;

    // Convert targetDate to user's timezone
    const targetDateInTimezone = toDate(
      formatInTimeZone(targetDate, currentTimezone, 'yyyy-MM-dd'),
      { timeZone: currentTimezone },
    );

    // Get full BaZi data from SajuService
    const forecastData = await this.sajuService.getTodayForecastData(
      birthDateTime,
      user.gender as 'male' | 'female',
      user.birthTimezone,
      user.isTimeKnown,
      targetDateInTimezone,
      currentTimezone,
    );

    // Calculate age for personalized context
    const age = differenceInYears(targetDateInTimezone, birthDateTime);

    // Generate LLM content
    const llmContent = await this.generateLLMContent(
      forecastData.userContext,
      forecastData.dailyRawData,
      forecastData.dailyAnalysis,
      targetDateInTimezone,
      currentTimezone,
      {
        age,
        gender: user.gender as 'male' | 'female',
        birthLocation: user.birthLocation,
        currentLocation: user.currentLocation,
      },
    );

    // Extract special patterns
    const specialPatterns = this.sajuService.extractSpecialPatterns(
      forecastData.dailyRawData,
      forecastData.dailyAnalysis,
    );

    // Extract active Ten Gods
    const activeTenGods = extractActiveTenGods(
      forecastData.userContext,
      forecastData.dailyRawData,
      forecastData.dailyAnalysis,
    );

    // Generate element relationship meaning
    const dayMaster = forecastData.userContext.natalStructure.personal;
    const dayMasterElement = `${dayMaster.element}-${dayMaster.yinYang === 'Yin' ? 'I' : 'O'}`;
    const dailyElement = forecastData.dailyRawData.dailyElement;
    const dailyYinYang = forecastData.dailyAnalysis.dayPillar?.stemYinYang || 'Yang';
    const dailyElementFormatted = `${dailyElement}-${dailyYinYang === 'Yin' ? 'I' : 'O'}`;
    
    const elementRelationshipMeaning = getElementRelationshipMeaning(
      dayMaster.element,
      dayMaster.yinYang,
      dailyElement,
      dailyYinYang,
      forecastData.userContext.favorableElements,
    );

    // Extract daily branch (animal) - same for everyone on the same day
    const dailyBranchChar = forecastData.dailyAnalysis.dayPillar?.branchChar;
    const dailyBranchAnimal = dailyBranchChar ? getBranchAnimal(dailyBranchChar) : null;
    const dailyBranchEmoji = dailyBranchChar ? getBranchEmoji(dailyBranchChar) : '✨';
    const dailyBranchMeaning = dailyBranchChar ? getBranchMeaning(dailyBranchChar) : 'Today\'s energy brings unique opportunities.';

    return {
      elementRelationship: {
        myElement: dayMasterElement,
        myElementEmoji: getElementEmoji(dayMaster.element),
        todayElement: dailyElementFormatted,
        todayElementEmoji: getElementEmoji(dailyElement),
        meaning: elementRelationshipMeaning,
      },
      dailyBranch: {
        character: dailyBranchChar || '',
        animal: dailyBranchAnimal || 'Unknown',
        emoji: dailyBranchEmoji,
        meaning: dailyBranchMeaning || 'Today\'s energy brings unique opportunities.',
      },
      activeTenGods,
      ...llmContent,
      specialPatterns,
    };
  }

  /**
   * Generate LLM-based content (reading, theme, subheading, goodThings, challenges)
   */
  private async generateLLMContent(
    userContext: any,
    dailyRawData: any,
    dailyAnalysis: any,
    targetDate: Date,
    currentTimezone: string,
    userDemographics?: {
      age: number;
      gender: 'male' | 'female';
      birthLocation: string;
      currentLocation: string;
    },
  ): Promise<{
    reading: { paragraphs: string[]; technicalBasis: string[] };
    theme: string;
    subheading: string;
    goodThings: Array<{
      title: string;
      description: string;
      emoji: string;
      howToMaximize: string;
      technicalBasis: string[];
    }>;
    challenges: Array<{
      title: string;
      description: string;
      emoji: string;
      whatToDo: string;
      technicalBasis: string[];
    }>;
  }> {
    // Define Zod schema for structured output
    const forecastSchema = z.object({
      reading: z.object({
        paragraphs: z
          .array(z.string())
          .min(3)
          .max(6)
          .describe('Array of paragraphs for the daily reading (3-6 paragraphs, each paragraph should be 2-4 sentences)'),
        technicalBasis: z
          .array(z.string())
          .describe('Array of technical explanations supporting the reading (BaZi terms allowed here)'),
      }),
      theme: z
        .string()
        .describe('Concise theme/title starting with "Day of" - must be 2-3 words total (e.g., "Day of Focus", "Day of Momentum", "Day of Clarity")'),
      subheading: z.string().describe('Supporting subheading (8-15 words)'),
      goodThings: z
        .array(
          z.object({
            title: z.string(),
            description: z.string(),
            emoji: z.string(),
            howToMaximize: z
              .string()
              .describe('Specific advice on how to maximize this opportunity'),
            technicalBasis: z
              .array(z.string())
              .describe('Array of technical explanations supporting this good thing (BaZi terms allowed here)'),
          }),
        )
        .max(3)
        .describe('0-3 positive examples/opportunities (only if reading highlights positive aspects)'),
      challenges: z
        .array(
          z.object({
            title: z.string(),
            description: z.string(),
            emoji: z.string(),
            whatToDo: z.string(),
            technicalBasis: z
              .array(z.string())
              .describe('Array of technical explanations supporting this challenge (BaZi terms allowed here)'),
          }),
        )
        .max(3)
        .describe('0-3 warnings/obstacles (only if reading highlights challenging aspects)'),
    });

    const systemPrompt = buildSystemPrompt();
    const userPrompt = buildUserPrompt({
      userContext,
      dailyRawData,
      dailyAnalysis,
      targetDate,
      currentTimezone,
      userDemographics,
    });

    try {
      const result = await generateText({
        model: geminiClient('gemini-2.5-flash'),
        system: systemPrompt,
        prompt: userPrompt,
        output: Output.object({
          schema: forecastSchema,
        }),
      });

      const validated = result.output;

      return {
        reading: {
          paragraphs: validated.reading.paragraphs || [],
          technicalBasis: validated.reading.technicalBasis || [],
        },
        theme: validated.theme,
        subheading: validated.subheading,
        goodThings: (validated.goodThings || []).map((item) => ({
          title: item.title,
          description: item.description,
          emoji: item.emoji,
          howToMaximize: item.howToMaximize,
          technicalBasis: item.technicalBasis || [],
        })),
        challenges: (validated.challenges || []).map((item) => ({
          title: item.title,
          description: item.description,
          emoji: item.emoji,
          whatToDo: item.whatToDo,
          technicalBasis: item.technicalBasis || [],
        })),
      };
    } catch (error) {
      this.logger.error(
        `Failed to generate LLM content: ${error.message}`,
        error.stack,
      );

      // Fallback response
      return {
        reading: {
          paragraphs: [
            'Today brings a balanced energy flow with opportunities in career and creativity.',
            'Focus on strategic planning and avoid impulsive decisions.',
          ],
          technicalBasis: [],
        },
        theme: 'Day of Focus',
        subheading: 'Channel your energy into meaningful work',
        goodThings: [],
        challenges: [],
      };
    }
  }

  /**
   * Generate 14-day forecast
   */
  async generate14DayForecast(userId: string): Promise<Forecast14Day> {
    // Fetch user data
    const user = await usersRepository.findById(userId);
    if (!user) {
      throw new NotFoundException('user_not_found');
    }

    // Convert stored date to proper timezone-aware Date object
    const birthDateString = user.birthDate.toISOString().split('.')[0];
    const birthDateTime = toDate(birthDateString, { timeZone: user.birthTimezone });

    // Get current timezone (fallback to birthTimezone if not set)
    const currentTimezone = user.currentTimezone || user.birthTimezone;

    // Get start date (tomorrow in user's timezone) - 14-day forecast starts from next day
    const today = new Date();
    const todayInTimezone = toDate(
      formatInTimeZone(today, currentTimezone, 'yyyy-MM-dd'),
      { timeZone: currentTimezone },
    );
    // Start from tomorrow (next 14 days, not including today)
    const startDate = addDays(todayInTimezone, 1);

    // Get 14-day data from SajuService
    const { days, userContext } = await this.sajuService.get14DayForecastData(
      birthDateTime,
      user.gender as 'male' | 'female',
      user.birthTimezone,
      user.isTimeKnown,
      startDate,
      currentTimezone,
    );

    // Validate we have exactly 14 days
    if (days.length !== 14) {
      throw new Error(`Expected 14 days of data, got ${days.length}`);
    }

    // 1. Calculate dominant data
    const dominantData = this.calculateDominantData(days, userContext);

    // 2. Generate LLM phase analysis
    const phases = await this.generatePhaseAnalysis(days, userContext, user);

    // 3. Build calendar
    const calendar = this.buildCalendar(days);

    // 4. Calculate best/worst days
    const { bestDays, worstDays } = this.calculateBestWorstDays(days);

    // 5. Mark peak days (top overall scores)
    const peakDates = this.getPeakDays(days);
    calendar.forEach((day) => {
      day.isPeak = peakDates.includes(day.date);
    });

    // 6. Mark worst days (lowest overall scores)
    const worstDates = this.getWorstDays(days);
    calendar.forEach((day) => {
      day.isWorst = worstDates.includes(day.date);
    });

    return {
      dominantData,
      phases,
      calendar,
      bestDays,
      worstDays,
    };
  }

  /**
   * Calculate dominant data (monthly element, active Ten Gods, patterns)
   * Does full extraction for each day (like daily forecast) and finds most dominant/redundant data group
   */
  private calculateDominantData(
    days: Array<{
      date: string;
      monthlyElement: string;
      activeTenGods: string[];
      activeTenGodsFull?: any[]; // Full ActiveTenGod objects from extraction
      specialPatterns: string[];
      specialPatternsFull?: any[]; // Full special pattern objects from extraction
      dailyRawData?: any;
      dailyAnalysis?: any;
    }>,
    userContext: UserContext,
  ): Forecast14Day['dominantData'] {
    // Count monthly elements
    const monthlyElementCounts: Record<string, number> = {};
    days.forEach((day) => {
      monthlyElementCounts[day.monthlyElement] =
        (monthlyElementCounts[day.monthlyElement] || 0) + 1;
    });

    // Get only the single most frequent monthly element
    const monthlyElementEntries = Object.entries(monthlyElementCounts)
      .sort((a, b) => b[1] - a[1]);
    
    const monthlyElements = monthlyElementEntries.length > 0
      ? (() => {
          const [elementStr, count] = monthlyElementEntries[0];
          const parts = elementStr.split('-');
          if (parts.length !== 2) {
            this.logger.warn(`Invalid element format: ${elementStr}, using fallback`);
            return [{
              element: elementStr,
              emoji: '✨',
              percentage: Math.round((count / days.length) * 100),
            }];
          }
          const [element, yinYang] = parts;
          const emoji = getElementEmoji(element as any);
          const percentage = Math.round((count / days.length) * 100);
          return [{
            element: elementStr,
            emoji,
            percentage,
          }];
        })()
      : [];

    // Find the most frequent/redundant DATA GROUP (combination), not individual items
    // Example: If days have [A,B,C], [A,B,C], [A,B,C], [A,B,D], [A,B,D]
    // We want to find [A,B,C] as the dominant group (appears 3 times)
    
    // For Ten Gods: Find the most frequent combination of Ten Gods across days
    const tenGodGroupCounts: Map<string, { count: number; group: any[] }> = new Map();
    days.forEach((day) => {
      // Create a sorted key from the Ten God technical names (to identify same group)
      const tenGodGroup = day.activeTenGodsFull && day.activeTenGodsFull.length > 0
        ? [...day.activeTenGodsFull].sort((a, b) => a.technicalName.localeCompare(b.technicalName))
        : [...day.activeTenGods].sort();
      
      const groupKey = tenGodGroup.map(tg => 
        typeof tg === 'string' ? tg : tg.technicalName
      ).join('|');
      
      if (!tenGodGroupCounts.has(groupKey)) {
        tenGodGroupCounts.set(groupKey, { count: 0, group: tenGodGroup });
      }
      tenGodGroupCounts.get(groupKey)!.count += 1;
    });

    // Find the most frequent Ten God group
    let dominantTenGodGroup: { count: number; group: any[] } | null = null;
    tenGodGroupCounts.forEach((data) => {
      if (!dominantTenGodGroup || data.count > dominantTenGodGroup.count) {
        dominantTenGodGroup = data;
      }
    });

    // Convert dominant group to the format expected
    // Use occurrenceCount from ActiveTenGod objects (number of pillars, same as daily forecast)
    const activeTenGods = dominantTenGodGroup && dominantTenGodGroup.group.length > 0
      ? dominantTenGodGroup.group.map((tg) => {
          if (typeof tg === 'string') {
            // Fallback: reconstruct from technical name (shouldn't happen if activeTenGodsFull is used)
            return {
              tenGod: {
                name: getTenGodDisplayName(tg) || tg,
                technicalName: tg,
                emoji: getTenGodEmoji(tg) || '✨',
                source: 'natal' as const,
                pillar: 'Multiple Days',
                category: getTenGodCategory(tg),
              },
              occurrenceCount: 1, // Default to 1 if we don't have full object
              percentage: 100, // Not meaningful for pillar count
            };
          } else {
            // Use full object from extraction - occurrenceCount is already the number of pillars
            return {
              tenGod: tg,
              occurrenceCount: tg.occurrenceCount || 1, // Number of pillars (same as daily forecast)
              percentage: 100, // Not meaningful for pillar count, but keep for interface compatibility
            };
          }
        })
      : [];

    // For patterns: Find the most frequent combination of patterns across days
    const patternGroupCounts: Map<string, { count: number; group: any[] }> = new Map();
    days.forEach((day) => {
      // Create a sorted key from pattern names (to identify same group)
      const patternGroup = day.specialPatternsFull && day.specialPatternsFull.length > 0
        ? [...day.specialPatternsFull].sort((a, b) => a.title.localeCompare(b.title))
        : [...day.specialPatterns].sort();
      
      const groupKey = patternGroup.map(p => 
        typeof p === 'string' ? p : p.title
      ).join('|');
      
      if (!patternGroupCounts.has(groupKey)) {
        patternGroupCounts.set(groupKey, { count: 0, group: patternGroup });
      }
      patternGroupCounts.get(groupKey)!.count += 1;
    });

    // Find the most frequent pattern group
    let dominantPatternGroup: { count: number; group: any[] } | null = null;
    patternGroupCounts.forEach((data) => {
      if (!dominantPatternGroup || data.count > dominantPatternGroup.count) {
        dominantPatternGroup = data;
      }
    });

    // Count individual pattern occurrences across all days (not just dominant group)
    const patternIndividualCounts: Map<string, number> = new Map();
    days.forEach((day) => {
      const patterns = day.specialPatternsFull && day.specialPatternsFull.length > 0
        ? day.specialPatternsFull
        : day.specialPatterns.map((name: string) => ({ title: name }));
      
      patterns.forEach((p: any) => {
        const patternName = typeof p === 'string' ? p : p.title;
        patternIndividualCounts.set(
          patternName,
          (patternIndividualCounts.get(patternName) || 0) + 1
        );
      });
    });

    // Convert dominant pattern group to the format expected, using individual counts
    const activePatterns = dominantPatternGroup && dominantPatternGroup.group.length > 0
      ? dominantPatternGroup.group.map((pattern) => {
          const patternName = typeof pattern === 'string' ? pattern : pattern.title;
          const individualCount = patternIndividualCounts.get(patternName) || 0;
          return {
            pattern: patternName,
            occurrenceCount: individualCount,
            percentage: Math.round((individualCount / days.length) * 100),
          };
        })
      : [];

    return {
      monthlyElements,
      activeTenGods,
      activePatterns,
    };
  }

  /**
   * Generate LLM phase analysis
   */
  private async generatePhaseAnalysis(
    days: Array<{
      date: string;
      dailyElement: string;
      monthlyElement: string;
      elementRelationship: 'favorable' | 'unfavorable' | 'neutral';
      activeTenGods: string[];
      specialPatterns: string[];
      scores: {
        career: number;
        wealth: number;
        relationships: number;
        health: number;
        creativity: number;
        rest: number;
      };
    }>,
    userContext: UserContext,
    user: { birthDate: Date; gender: string },
  ): Promise<Forecast14Day['phases']> {
    // Split into 3 phases
    const phase1 = days.slice(0, 5); // Day 1-5
    const phase2 = days.slice(5, 10); // Day 6-10
    const phase3 = days.slice(10, 14); // Day 11-14

    // Build user prompt for each phase
    const buildPhasePrompt = (phaseDays: any[], phaseName: string) => {
      const age = differenceInYears(new Date(), user.birthDate);
      const ageRange =
        age < 18
          ? 'teenager'
          : age < 25
            ? 'young adult'
            : age < 35
              ? 'adult'
              : age < 50
                ? 'mid-career'
                : age < 65
                  ? 'experienced'
                  : 'senior';

      return `Analyze this ${phaseName} period (${phaseDays.length} days) and provide phase-specific insights based on BaZi elements, relationships, and patterns.

User Context:
- Age range: ${ageRange}
- Gender: ${user.gender}
- Day Master: ${userContext.natalStructure.personal.element}-${userContext.natalStructure.personal.yinYang === 'Yin' ? 'I' : 'O'}

Phase Data (${phaseDays.length} days):
${phaseDays
  .map(
    (day, idx) => `
Day ${idx + 1} (${day.date}):
- Daily Element: ${day.dailyElement}
- Monthly Element: ${day.monthlyElement}
- Element Relationship: ${day.elementRelationship}
- Active Ten Gods: ${day.activeTenGods.length > 0 ? day.activeTenGods.join(', ') : 'None'}
- Special Patterns: ${day.specialPatterns.length > 0 ? day.specialPatterns.join(', ') : 'None'}
`,
  )
  .join('\n')}

Analyze the BaZi data above:
- Element relationships (favorable/unfavorable/neutral) indicate energy flow
- Active Ten Gods show what energies are prominent
- Special patterns reveal unique opportunities or challenges
- Look for trends across the days in this phase

Generate:
1. Theme (2-4 words) - reflect the overall energy and character of this phase
2. Overview (max 50 words, conversational and practical) - describe what the BaZi data indicates
3. Focus Areas (max 4 items, specific and actionable) - based on element relationships and patterns

Use plain English, no BaZi terms. Base everything on the BaZi elements, relationships, and patterns provided.`;
    };

    // Generate for all 3 phases
    const [phase1Result, phase2Result, phase3Result] = await Promise.all([
      this.generatePhaseLLM(phase1, buildPhasePrompt(phase1, 'Day 1-5')),
      this.generatePhaseLLM(phase2, buildPhasePrompt(phase2, 'Day 6-10')),
      this.generatePhaseLLM(phase3, buildPhasePrompt(phase3, 'Day 11-14')),
    ]);

    return [
      { days: 'Day 1-5', ...phase1Result },
      { days: 'Day 6-10', ...phase2Result },
      { days: 'Day 11-14', ...phase3Result },
    ];
  }

  /**
   * Generate phase analysis using LLM
   */
  private async generatePhaseLLM(phaseDays: any[], userPrompt: string): Promise<{
    theme: string;
    overview: string;
    focusAreas: string[];
  }> {
    try {
      const result = await generateText({
        model: geminiClient('gemini-2.5-flash'),
        system: phaseAnalysisSystemPrompt,
        prompt: userPrompt,
        output: Output.object({
          schema: phaseAnalysisSchema,
        }),
      });

      const validated = result.output;

      // The schema returns phases array, but we're generating one phase at a time
      // So we expect exactly one phase in the array
      if (validated.phases && validated.phases.length > 0) {
        const phase = validated.phases[0];
        // Validate the phase has proper content (not just fallback)
        if (phase.theme && phase.overview && phase.focusAreas && phase.focusAreas.length > 0) {
          return phase;
        }
      }

      // Log error and return fallback
      this.logger.warn('LLM returned invalid phase structure, using fallback', {
        output: validated,
        promptLength: userPrompt.length,
      });
      return {
        theme: 'Building Momentum',
        overview: 'This phase brings steady progress and opportunities for growth.',
        focusAreas: ['Focus on key priorities', 'Maintain steady progress'],
      };
    } catch (error) {
      this.logger.error('Error generating phase analysis:', error);
      this.logger.error('Prompt that failed:', userPrompt.substring(0, 500));
      return {
        theme: 'Building Momentum',
        overview: 'This phase brings steady progress and opportunities for growth.',
        focusAreas: ['Focus on key priorities', 'Maintain steady progress'],
      };
    }
  }

  /**
   * Build 14-day calendar
   */
  private buildCalendar(
    days: Array<{
      date: string;
      dailyElement: string;
      dailyBranch: string;
    }>,
  ): Forecast14Day['calendar'] {
    const calendar = days.map((day) => {
      const parts = day.dailyElement.split('-');
      if (parts.length !== 2) {
        this.logger.warn(`Invalid daily element format: ${day.dailyElement} for date ${day.date}`);
        return {
          date: day.date,
          element: day.dailyElement,
          elementEmoji: '✨',
          animal: getBranchAnimal(day.dailyBranch) || 'Unknown',
          animalEmoji: getBranchEmoji(day.dailyBranch),
          isPeak: false, // Will be set later
          isWorst: false, // Will be set later
        };
      }
      const [element, yinYang] = parts;
      const elementEmoji = getElementEmoji(element as any);
      const animal = getBranchAnimal(day.dailyBranch) || 'Unknown';
      const animalEmoji = getBranchEmoji(day.dailyBranch);

      return {
        date: day.date,
        element: day.dailyElement,
        elementEmoji,
        animal,
        animalEmoji,
        isPeak: false, // Will be set later
        isWorst: false, // Will be set later
      };
    });
    
    // Validate calendar has exactly 14 items
    if (calendar.length !== 14) {
      throw new Error(`Calendar should have 14 days, got ${calendar.length}`);
    }
    
    return calendar;
  }

  /**
   * Calculate best/worst days for each category
   */
  private calculateBestWorstDays(
    days: Array<{
      date: string;
      scores: {
        career: number;
        relationships: number;
        creativity: number;
        wealth: number;
        health: number;
        rest: number;
      };
      elementRelationship: 'favorable' | 'unfavorable' | 'neutral';
    }>,
  ): {
    bestDays: Forecast14Day['bestDays'];
    worstDays: Forecast14Day['worstDays'];
  } {
    const categories = ['career', 'relationship', 'creativity', 'wealth', 'health', 'rest'] as const;

    const bestDays: Forecast14Day['bestDays'] = {
      career: [],
      relationship: [],
      creativity: [],
      wealth: [],
      health: [],
      rest: [],
    };

    const worstDays: Forecast14Day['worstDays'] = {
      career: [],
      relationship: [],
      creativity: [],
      wealth: [],
      health: [],
      rest: [],
    };

    categories.forEach((category) => {
      // Map category to score key
      const scoreKey =
        category === 'relationship' ? 'relationships' : category;

      // Sort by score (descending for best, ascending for worst)
      const sorted = [...days].sort((a, b) => b.scores[scoreKey] - a.scores[scoreKey]);

      // Top 2 best - take first 2 from sorted array
      // If there are ties, we'll take the first ones encountered (deterministic)
      const best = sorted
        .slice(0, 2)
        .map((day) => ({
          date: day.date,
          score: day.scores[scoreKey],
          reason: this.getCategoryReason(day, category, 'best'),
        }));

      // Bottom 2 worst - reverse and take first 2
      const worst = sorted
        .reverse() // Now ascending (worst first)
        .slice(0, 2)
        .map((day) => ({
          date: day.date,
          score: day.scores[scoreKey],
          reason: this.getCategoryReason(day, category, 'worst'),
        }));

      bestDays[category] = best;
      worstDays[category] = worst;
    });

    return { bestDays, worstDays };
  }

  /**
   * Get reason for best/worst day in a category
   */
  private getCategoryReason(
    day: {
      elementRelationship: 'favorable' | 'unfavorable' | 'neutral';
      scores: {
        career: number;
        relationships: number;
        creativity: number;
        wealth: number;
        health: number;
        rest: number;
      };
    },
    category: string,
    type: 'best' | 'worst',
  ): string {
    // Simplified reason based on element relationship and scores
    const elementRel = day.elementRelationship;
    const score = day.scores[category === 'relationship' ? 'relationships' : category];

    if (type === 'best') {
      if (elementRel === 'favorable') {
        return 'Favorable energy alignment supports this area today.';
      } else if (score > 55) {
        return 'Strong supportive forces enhance this area.';
      } else {
        return 'Positive influences create opportunities here.';
      }
    } else {
      if (elementRel === 'unfavorable') {
        return 'Challenging energy requires extra care in this area.';
      } else if (score < 45) {
        return 'Weaker forces suggest taking a cautious approach.';
      } else {
        return 'Consider focusing energy elsewhere today.';
      }
    }
  }

  /**
   * Get peak days (top overall scores)
   */
  private getPeakDays(
    days: Array<{
      date: string;
      scores: { overall: number };
    }>,
  ): string[] {
    if (days.length === 0) {
      return [];
    }
    
    const sorted = [...days].sort((a, b) => b.scores.overall - a.scores.overall);
    // SINGLE peak day (or duplicates if tie) - highest overall score
    const highestScore = sorted[0]?.scores.overall;
    
    // Include all days with the highest score (handles ties)
    const peakDays = sorted.filter(
      (day) => day.scores.overall === highestScore,
    );
    
    return peakDays.map((day) => day.date);
  }

  /**
   * Get worst days (lowest overall scores)
   * Returns single worst day (or duplicates if tie) - lowest overall score
   */
  private getWorstDays(
    days: Array<{
      date: string;
      scores: { overall: number };
    }>,
  ): string[] {
    if (days.length === 0) {
      return [];
    }
    
    const sorted = [...days].sort((a, b) => a.scores.overall - b.scores.overall);
    // SINGLE worst day (or duplicates if tie) - lowest overall score
    const lowestScore = sorted[0]?.scores.overall;
    
    // Include all days with the lowest score (handles ties)
    const worstDays = sorted.filter(
      (day) => day.scores.overall === lowestScore,
    );
    
    return worstDays.map((day) => day.date);
  }
}
