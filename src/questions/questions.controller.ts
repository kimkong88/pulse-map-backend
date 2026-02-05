import { Controller, Get, Post, Body, Param, Query, UseGuards } from '@nestjs/common';
import { QuestionsService } from './questions.service';
import { AuthGuard } from '../guards/authGuard';
import { UserContext } from '../decorators/userContext';
import {
  IsString,
  IsISO8601,
  Matches,
  IsEnum,
  IsBoolean,
} from 'class-validator';

class AnswerQuestionDto {
  @IsString()
  questionId: string;

  @IsISO8601({ strict: true })
  @Matches(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}$/, {
    message:
      'birthDate must be an ISO 8601 string without timezone (e.g., "YYYY-MM-DDTHH:mm:ss")',
  })
  birthDate: string;

  @IsEnum(['male', 'female'])
  gender: 'male' | 'female';

  @IsString()
  birthTimezone: string;

  @IsBoolean()
  isTimeKnown: boolean;
}

@Controller('questions')
export class QuestionsController {
  constructor(private readonly questionsService: QuestionsService) {}

  /**
   * Get all available questions (mock questions - legacy endpoint)
   */
  @Get('list')
  getMockQuestions() {
    return this.questionsService.getMockQuestions();
  }

  /**
   * Get questions (automatically triggers generation if needed)
   * GET /questions?scope=me|daily&date=YYYY-MM-DD
   * Returns existing question if found, otherwise creates pending and processes in background
   */
  @UseGuards(AuthGuard)
  @Get()
  async getQuestions(
    @UserContext() userContext: { user: { id: string } },
    @Query('scope') scope: 'me' | 'daily',
    @Query('date') date?: string, // Optional: YYYY-MM-DD format (only used for daily scope)
  ) {
    if (!scope || (scope !== 'me' && scope !== 'daily')) {
      throw new Error('Invalid scope. Must be "me" or "daily"');
    }
    
    // Validate date format if provided
    if (date && !/^\d{4}-\d{2}-\d{2}$/.test(date)) {
      throw new Error('Invalid date format. Must be YYYY-MM-DD');
    }
    
    return this.questionsService.createQuestions(
      userContext.user.id,
      scope,
      date ? new Date(date + 'T00:00:00') : undefined,
    );
  }

  /**
   * Get a specific question by ID
   */
  @Get(':id')
  getQuestion(@Param('id') id: string) {
    return this.questionsService.getQuestionById(id);
  }

  /**
   * Answer a question (for testing - requires user data in body)
   */
  @UseGuards(AuthGuard)
  @Post(':id/answer')
  async answerQuestion(
    @Param('id') questionId: string,
    @Body() dto: AnswerQuestionDto,
    @UserContext() context: { user: { id: string } },
  ) {
    const birthDate = new Date(dto.birthDate + 'Z');

    return this.questionsService.answerQuestion({
      userId: context.user.id,
      questionId,
      birthDate,
      gender: dto.gender,
      birthTimezone: dto.birthTimezone,
      isTimeKnown: dto.isTimeKnown,
    });
  }
}
