import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { generateText, Output } from 'ai';
import { BaziCalculator, PersonalizedDailyAnalysisOutput } from '@aharris02/bazi-calculator-by-alvamind';
import { createBaziTools } from '../saju/tools';
import { geminiClient, openAIClient } from '../utils/ai';
import {
  buildSystemPrompt,
  buildUserPrompt,
  buildContinuationPrompt,
} from './prompts/index';
import { SajuService } from '../saju/saju.service';
import { BaziDataExtractor } from '../saju/utils/baziExtractor.util';
import { toDate, formatInTimeZone } from 'date-fns-tz';
import { differenceInYears } from 'date-fns';
import { z } from 'zod';
import * as usersRepository from '../repositories/users.repository';
import * as questionsRepository from '../repositories/questions.repository';
import {
  buildQuestionsSystemPrompt,
  buildMeQuestionsPrompt,
  buildDailyQuestionsPrompt,
} from './prompts/questions-index';

// Mock questions for testing
const MOCK_QUESTIONS = [
  {
    id: 'wealth',
    title: 'When will I get rich?',
    category: 'wealth',
    preview:
      'Discover your optimal wealth accumulation periods, financial decision timing, and investment windows based on your chart wealth cycles.',
    isPremium: true,
  },
  {
    id: 'marriage',
    title: 'When will I get married?',
    category: 'relationships',
    preview:
      'Learn about your relationship timing windows, compatibility patterns, and optimal periods for committed partnerships.',
    isPremium: true,
  },
  {
    id: 'career',
    title: 'When will I get promoted?',
    category: 'career',
    preview:
      'Understand your career advancement cycles, leadership opportunities, and optimal timing for major career moves.',
    isPremium: true,
  },
  {
    id: 'success',
    title: 'Will I be successful?',
    category: 'life',
    preview:
      'Explore your success patterns, natural advantages, and the paths where your chart shows the highest potential for achievement.',
    isPremium: true,
  },
];

interface AnswerQuestionInput {
  userId: string;
  questionId: string;
  birthDate: Date;
  gender: 'male' | 'female';
  birthTimezone: string;
  isTimeKnown: boolean;
}

const QuestionsResponseSchema = z.object({
  questions: z.array(
    z.object({
      title: z.string(),
      description: z.string(),
    }),
  ),
});

@Injectable()
export class QuestionsService {
  private readonly logger = new Logger(QuestionsService.name);


  constructor(
    private readonly sajuService: SajuService,
  ) {}

  /**
   * Answer a BaZi life question using AI tools
   */
  async answerQuestion(input: AnswerQuestionInput) {
    const question = MOCK_QUESTIONS.find((q) => q.id === input.questionId);
    if (!question) {
      throw new Error('Question not found');
    }

    this.logger.log(
      `Answering question: ${question.title} for user ${input.userId}`,
    );

    // Create BaZi calculator and tools
    const calculator = new BaziCalculator(
      input.birthDate,
      input.gender === 'male' ? 'male' : 'female',
      input.birthTimezone,
      input.isTimeKnown,
    );

    const tools = createBaziTools(
      calculator,
      input.birthDate,
      input.birthTimezone,
    );

    // Current age for context
    const currentAge = new Date().getFullYear() - input.birthDate.getFullYear();

    // Build prompts
    const systemPrompt = buildSystemPrompt(question.category);
    const userPrompt = buildUserPrompt(
      question.title,
      question.preview,
      currentAge,
      input.gender,
    );

    try {
      // Use OpenAI if TEST_USE_OPENAI=true, otherwise use Gemini
      const useOpenAI = process.env.TEST_USE_OPENAI === 'true';
      const model = useOpenAI
        ? openAIClient('gpt-4o')
        : geminiClient('gemini-2.5-flash');

      // Call all required tools ourselves to ensure we get all data
      // This avoids Gemini's message format issues with continuation
      const toolResultsContext = await this.callAllTools(
        tools,
        currentAge,
        input.birthDate,
      );

      // Build prompt with all tool results
      const promptWithToolResults = buildContinuationPrompt(
        userPrompt,
        toolResultsContext,
      );

      // Generate answer with all tool data in one go
      const result = await generateText({
        model,
        system: systemPrompt,
        prompt: promptWithToolResults,
        toolChoice: 'none', // No tools needed, we already have all data
      });

      const finalText = result.text;
      const toolCallsCount = toolResultsContext.length;

      if (!finalText || finalText.length === 0) {
        throw new Error('Model generated empty response.');
      }

      // Parse the response into structured format
      const parsedResponse = this.parseResponse(finalText);

      // Extract entertainment metrics from the response
      const entertainmentMetrics = this.extractMetrics(
        finalText,
        question.category,
      );

      return {
        question: {
          id: question.id,
          title: question.title,
          category: question.category,
        },
        answer: parsedResponse,
        metrics: entertainmentMetrics,
        metadata: {
          age: currentAge,
          toolCallsCount: toolCallsCount,
          tokensUsed: result.usage.totalTokens,
        },
      };
    } catch (error) {
      this.logger.error(
        `Failed to answer question: ${error.message}`,
        error.stack,
      );
      throw error;
    }
  }

  /**
   * Call all required tools and return their results as context strings
   */
  private async callAllTools(
    tools: any,
    currentAge: number,
    birthDate: Date,
  ): Promise<string[]> {
    const toolResultsContext: string[] = [];
    const currentYear = new Date().getFullYear();

    // 1. getBasicAnalysis
    try {
      const basicResult = await (tools.getBasicAnalysis as any).execute({});
      if (basicResult && !basicResult.error) {
        toolResultsContext.push(
          `Tool: getBasicAnalysis\nResult: ${JSON.stringify(basicResult, null, 2)}`,
        );
      } else {
        toolResultsContext.push(
          `Tool: getBasicAnalysis\nResult: [ERROR] ${basicResult?.error || 'Unknown error'}`,
        );
      }
    } catch (error: any) {
      toolResultsContext.push(
        `Tool: getBasicAnalysis\nResult: [ERROR] ${error.message}`,
      );
    }

    // 2. getLuckPillarAtAge
    try {
      const luckResult = await (tools.getLuckPillarAtAge as any).execute({
        age: currentAge,
      });
      // Include result even if available: false (birth time unknown) - model can work with this
      if (luckResult && !luckResult.error) {
        toolResultsContext.push(
          `Tool: getLuckPillarAtAge\nResult: ${JSON.stringify(luckResult, null, 2)}`,
        );
      } else {
        toolResultsContext.push(
          `Tool: getLuckPillarAtAge\nResult: [ERROR] ${luckResult?.error || 'Unknown error'}`,
        );
      }
    } catch (error: any) {
      toolResultsContext.push(
        `Tool: getLuckPillarAtAge\nResult: [ERROR] ${error.message}`,
      );
    }

    // 3. getYearPillars
    try {
      const years = [
        currentYear,
        currentYear + 1,
        currentYear + 2,
        currentYear + 3,
        currentYear + 4,
      ];
      const yearPillarsResult = await (tools.getYearPillars as any).execute({
        years,
      });
      if (yearPillarsResult && !yearPillarsResult.error) {
        toolResultsContext.push(
          `Tool: getYearPillars\nResult: ${JSON.stringify(yearPillarsResult, null, 2)}`,
        );
      } else {
        toolResultsContext.push(
          `Tool: getYearPillars\nResult: [ERROR] ${yearPillarsResult?.error || 'Unknown error'}`,
        );
      }
    } catch (error: any) {
      toolResultsContext.push(
        `Tool: getYearPillars\nResult: [ERROR] ${error.message}`,
      );
    }

    // 4. getYearInteractions (call for a few promising years)
    try {
      const interactionYears = [currentYear, currentYear + 1, currentYear + 2];
      for (const year of interactionYears) {
        try {
          const interactionResult = await (
            tools.getYearInteractions as any
          ).execute({ year });
          if (interactionResult && !interactionResult.error) {
            toolResultsContext.push(
              `Tool: getYearInteractions(${year})\nResult: ${JSON.stringify(interactionResult, null, 2)}`,
            );
          }
        } catch (error: any) {
          // Skip individual year errors
        }
      }
    } catch (error: any) {
      // Skip if tool doesn't exist or fails
    }

    return toolResultsContext;
  }

  /**
   * Extract tool results from all steps for continuation (legacy, kept for compatibility)
   */
  private extractToolResults(result: any): string[] {
    const toolResultsContext: string[] = [];
    result.steps.forEach((step) => {
      if (step.toolResults && step.toolResults.length > 0) {
        step.toolResults.forEach((tr: any) => {
          try {
            // Use 'output' property, not 'result' (AI SDK uses 'output')
            const toolOutput = tr.output || tr.result;

            if (toolOutput === undefined || toolOutput === null) {
              toolResultsContext.push(
                `Tool: ${tr.toolName || 'unknown'}\nResult: [Tool returned no result - may have failed]`,
              );
            } else if (typeof toolOutput === 'object' && toolOutput.error) {
              toolResultsContext.push(
                `Tool: ${tr.toolName || 'unknown'}\nResult: [ERROR] ${toolOutput.error}`,
              );
            } else {
              const resultStr =
                typeof toolOutput === 'object'
                  ? JSON.stringify(toolOutput, null, 2)
                  : String(toolOutput);
              toolResultsContext.push(
                `Tool: ${tr.toolName || 'unknown'}\nResult: ${resultStr}`,
              );
            }
          } catch (e) {
            toolResultsContext.push(
              `Tool: ${tr.toolName || 'unknown'}\nResult: [Error serializing result: ${e}]`,
            );
          }
        });
      }
    });
    return toolResultsContext;
  }

  /**
   * Parse the LLM response into structured sections
   */
  private parseResponse(text: string) {
    if (!text || text.length === 0) {
      return {
        fullText: '',
        sections: [],
      };
    }

    // Remove metrics section if present
    const cleanText = text
      .replace(/\[METRICS\][\s\S]*?\[\/METRICS\]/g, '')
      .trim();

    // Split into paragraphs (double newline) for display
    const sections = cleanText
      .split(/\n\n+/)
      .map((s) => s.trim())
      .filter((s) => s.length > 0);

    return {
      fullText: cleanText,
      sections: sections.map((content) => ({ content })),
    };
  }

  /**
   * Extract entertainment metrics from the response
   */
  private extractMetrics(text: string, category: string) {
    const metricsMatch = text.match(/\[METRICS\]([\s\S]*?)\[\/METRICS\]/);

    if (!metricsMatch) {
      return {
        likelihood: 50,
        timingClarity: 50,
        challengeLevel: 50,
      };
    }

    const metricsText = metricsMatch[1];

    const likelihood = this.extractMetricValue(metricsText, 'likelihood');
    const timingClarity = this.extractMetricValue(
      metricsText,
      'timing_clarity',
    );
    const challengeLevel = this.extractMetricValue(
      metricsText,
      'challenge_level',
    );

    return {
      likelihood,
      timingClarity,
      challengeLevel,
    };
  }

  /**
   * Extract a single metric value from the metrics text
   */
  private extractMetricValue(text: string, metricName: string): number {
    const regex = new RegExp(`${metricName}:\\s*(\\d+)`, 'i');
    const match = text.match(regex);

    if (match && match[1]) {
      const value = parseInt(match[1], 10);
      return Math.min(100, Math.max(0, value)); // Clamp between 0-100
    }

    return 50; // Default fallback
  }

  /**
   * Get all available questions (mock for now)
   */
  getMockQuestions() {
    return MOCK_QUESTIONS;
  }

  /**
   * Get a specific question by ID
   */
  getQuestionById(id: string) {
    return MOCK_QUESTIONS.find((q) => q.id === id);
  }

  /**
   * Get questions (reports-style: always return existing or pending)
   * Returns last completed questions (even if expired) while generating new ones in background
   */
  async getQuestions(
    userId: string,
    scope: 'me' | 'daily',
    targetDate?: Date, // Optional: specific date for daily scope (defaults to today)
  ): Promise<{
    id: string;
    type: 'personal' | 'daily';
    status: 'pending' | 'in_progress' | 'completed' | 'failed';
    questions?: Array<{
      title: string;
      description: string;
    }>;
    expiresAt?: Date;
    error?: string;
  }> {
    // Get user
    const user = await usersRepository.findById(userId);
    if (!user) {
      throw new NotFoundException('User not found');
    }

    // Build input data for lookup
    const birthDateString = user.birthDate.toISOString().split('.')[0];
    const birthDateTime = toDate(birthDateString, { timeZone: user.birthTimezone });
    const today = new Date();
    const age = differenceInYears(today, birthDateTime);
    const ageRange = `${Math.floor(age / 10) * 10}-${Math.floor(age / 10) * 10 + 10}`;

    const currentTimezone = user.currentTimezone || user.birthTimezone;
    const dateToUse = targetDate || today;
    const dateString = scope === 'daily'
      ? formatInTimeZone(dateToUse, currentTimezone, 'yyyy-MM-dd')
      : undefined;

    const inputData = {
      scope,
      birthDateTime: birthDateTime.toISOString(),
      gender: user.gender as 'male' | 'female',
      birthTimezone: user.birthTimezone,
      isTimeKnown: user.isTimeKnown,
      ageRange,
      date: dateString,
    };

    // Map scope to question type
    const questionType: 'personal' | 'daily' = scope === 'me' ? 'personal' : 'daily';

    // Check for existing question by input data
    const existingQuestion = await questionsRepository.findQuestionByInput(inputData);

    if (existingQuestion) {
      // Return existing question (could be pending, in_progress, completed, or failed)
      const data = existingQuestion.data as any;
      return {
        id: existingQuestion.id,
        type: existingQuestion.type as 'personal' | 'daily',
        status: existingQuestion.status,
        questions: data?.questions || undefined,
        expiresAt: existingQuestion.expiresAt || undefined,
        error: data?.error || undefined,
      };
    }

    // No question exists - return pending status (200 OK, not 404)
    return {
      id: '',
      type: questionType,
      status: 'pending',
    };
  }

  /**
   * Create or get questions (reports-style)
   * Returns existing question if found, otherwise creates pending and processes in background
   */
  async createQuestions(
    userId: string,
    scope: 'me' | 'daily',
    targetDate?: Date, // Optional: specific date for daily scope (defaults to today)
  ): Promise<{
    id: string;
    type: 'personal' | 'daily';
    status: 'pending' | 'in_progress' | 'completed' | 'failed';
    questions?: Array<{
      title: string;
      description: string;
    }>;
    expiresAt?: Date;
    error?: string;
  }> {
    // Get user
    const user = await usersRepository.findById(userId);
    if (!user) {
      throw new NotFoundException('User not found');
    }

    // Build input data for lookup
    const birthDateString = user.birthDate.toISOString().split('.')[0];
    const birthDateTime = toDate(birthDateString, { timeZone: user.birthTimezone });
    const today = new Date();
    const age = differenceInYears(today, birthDateTime);
    const ageRange = `${Math.floor(age / 10) * 10}-${Math.floor(age / 10) * 10 + 10}`;

    const currentTimezone = user.currentTimezone || user.birthTimezone;
    const dateToUse = targetDate || today;
    const dateString = scope === 'daily'
      ? formatInTimeZone(dateToUse, currentTimezone, 'yyyy-MM-dd')
      : undefined;

    const inputData = {
      scope,
      birthDateTime: birthDateTime.toISOString(),
      gender: user.gender as 'male' | 'female',
      birthTimezone: user.birthTimezone,
      isTimeKnown: user.isTimeKnown,
      ageRange,
      date: dateString,
    };

    // Map scope to question type
    const questionType: 'personal' | 'daily' = scope === 'me' ? 'personal' : 'daily';

    // Check for existing question (any status)
    const existingQuestion = await questionsRepository.findQuestionByInput(inputData);

    if (existingQuestion) {
      // Return existing question (could be pending, in_progress, completed, or failed)
      const data = existingQuestion.data as any;
      
      // If completed but expired, trigger background refresh
      if (existingQuestion.status === 'completed' && existingQuestion.expiresAt) {
        const now = new Date();
        if (existingQuestion.expiresAt < now) {
          // Expired - trigger background refresh but return old questions
          this.processQuestionsGeneration(userId, scope, targetDate).catch((error) => {
            this.logger.error(`Failed to refresh expired questions: ${error.message}`);
          });
        }
      }
      
      return {
        id: existingQuestion.id,
        type: existingQuestion.type as 'personal' | 'daily',
        status: existingQuestion.status,
        questions: data?.questions || undefined,
        expiresAt: existingQuestion.expiresAt || undefined,
        error: data?.error || undefined,
      };
    }

    // Check for last completed question (even if expired) - show while generating new
    const lastCompleted = await questionsRepository.findLastCompletedQuestionByInput(inputData);

    // Create pending question
    const question = await questionsRepository.createQuestion({
      type: questionType,
      status: 'pending',
      input: inputData,
      data: {},
      expiresAt: new Date(Date.now() + 48 * 60 * 60 * 1000), // 48 hours
    });

    // Start background processing (non-blocking)
    this.processQuestionsGeneration(userId, scope, targetDate).catch((error) => {
      this.logger.error(`Failed to process questions: ${error.message}`);
    });

    // If we have last completed questions, return them (even if expired)
    // This way user sees something while new questions generate
    if (lastCompleted) {
      const lastData = lastCompleted.data as any;
      return {
        id: question.id,
        type: questionType,
        status: 'pending', // New generation is pending
        questions: lastData?.questions || undefined, // But show old questions
        expiresAt: lastCompleted.expiresAt || undefined,
      };
    }

    // No previous questions - return pending
    return {
      id: question.id,
      type: questionType,
      status: 'pending',
    };
  }

  /**
   * Background processing for questions generation
   */
  private async processQuestionsGeneration(
    userId: string,
    scope: 'me' | 'daily',
    targetDate?: Date,
  ) {
    try {
      // Get user
      const user = await usersRepository.findById(userId);
      if (!user) {
        throw new Error('User not found');
      }

      // Calculate all input data once
      const birthDateString = user.birthDate.toISOString().split('.')[0];
      const birthDateTime = toDate(birthDateString, { timeZone: user.birthTimezone });
      const today = new Date();
      const age = differenceInYears(today, birthDateTime);
      const ageRange = `${Math.floor(age / 10) * 10}-${Math.floor(age / 10) * 10 + 10}`;
      const currentTimezone = user.currentTimezone || user.birthTimezone;
      const dateToUse = targetDate || today;
      const dateString = scope === 'daily'
        ? formatInTimeZone(dateToUse, currentTimezone, 'yyyy-MM-dd')
        : undefined;

      const inputData = {
        scope,
        birthDateTime: birthDateTime.toISOString(),
        gender: user.gender as 'male' | 'female',
        birthTimezone: user.birthTimezone,
        isTimeKnown: user.isTimeKnown,
        ageRange,
        date: dateString,
      };

      // Find the pending question we just created
      const question = await questionsRepository.findQuestionByInput(inputData);

      if (!question) {
        throw new Error('Question not found');
      }

      // Update to in_progress
      await questionsRepository.updateQuestion(question.id, {
        status: 'in_progress',
      });

      // Get userContext (natal chart only)
      const calculator = new BaziCalculator(
        birthDateTime,
        user.gender as 'male' | 'female',
        user.birthTimezone,
        user.isTimeKnown,
      );
      const baseAnalysis = calculator.getCompleteAnalysis();
      if (!baseAnalysis) {
        throw new Error('Failed to get complete analysis');
      }
      const userContext = BaziDataExtractor.buildUserContext(baseAnalysis);

      // Build demographics
      const demographics = {
        age,
        ageRange,
        gender: user.gender as 'male' | 'female',
        birthLocation: user.birthLocation,
        currentLocation: user.currentLocation,
      };

      // Build daily data if scope is 'daily'
      let dailyData: { dailyRawData: any; dailyAnalysis: any } | undefined;
      if (scope === 'daily') {
        const dateInTimezone = toDate(
          formatInTimeZone(dateToUse, currentTimezone, 'yyyy-MM-dd'),
          { timeZone: currentTimezone },
        );

        const dailyAnalysis = calculator.getAnalysisForDate(
          dateInTimezone,
          currentTimezone,
          { type: 'personalized' },
        ) as PersonalizedDailyAnalysisOutput | null;

        if (!dailyAnalysis) {
          throw new Error('Failed to get daily analysis');
        }

        const generalAnalysis = calculator.getAnalysisForDate(
          dateInTimezone,
          currentTimezone,
          { type: 'general' },
        ) as any;

        const dailyRawData = BaziDataExtractor.extract(userContext, dailyAnalysis, generalAnalysis);

        dailyData = {
          dailyRawData,
          dailyAnalysis,
        };
      }

      // Build prompts
      const systemPrompt = buildQuestionsSystemPrompt();
      const userPrompt = scope === 'me'
        ? buildMeQuestionsPrompt({ demographics, userContext })
        : buildDailyQuestionsPrompt({ demographics, userContext, dailyData: dailyData! });

      // Generate questions via LLM
      const result = await generateText({
        model: geminiClient('gemini-2.5-flash'),
        system: systemPrompt,
        prompt: userPrompt,
        output: Output.object({
          schema: QuestionsResponseSchema,
        }),
      });

      const validated = result.output;

      // Update question with completed status and data
      const expiresAt = new Date(Date.now() + 48 * 60 * 60 * 1000); // 48 hours
      await questionsRepository.updateQuestion(question.id, {
        status: 'completed',
        data: {
          scope,
          questions: validated.questions,
        },
        expiresAt,
      });

      this.logger.log(`Questions ${question.id} completed successfully`);
    } catch (error) {
      this.logger.error(
        `Failed to process questions: ${error.message}`,
        error.stack,
      );

      // Find question and update to failed
      const user = await usersRepository.findById(userId);
      if (user) {
        const birthDateString = user.birthDate.toISOString().split('.')[0];
        const birthDateTime = toDate(birthDateString, { timeZone: user.birthTimezone });
        const today = new Date();
        const age = differenceInYears(today, birthDateTime);
        const ageRange = `${Math.floor(age / 10) * 10}-${Math.floor(age / 10) * 10 + 10}`;

        const currentTimezone = user.currentTimezone || user.birthTimezone;
        const dateToUse = targetDate || today;
        const dateString = scope === 'daily'
          ? formatInTimeZone(dateToUse, currentTimezone, 'yyyy-MM-dd')
          : undefined;

        const inputData = {
          scope,
          birthDateTime: birthDateTime.toISOString(),
          gender: user.gender as 'male' | 'female',
          birthTimezone: user.birthTimezone,
          isTimeKnown: user.isTimeKnown,
          ageRange,
          date: dateString,
        };

        const question = await questionsRepository.findQuestionByInput(inputData);

        if (question) {
          await questionsRepository.updateQuestion(question.id, {
            status: 'failed',
            data: { error: error.message },
          });
        }
      }
    }
  }
}
