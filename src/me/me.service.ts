import {
  Injectable,
  NotFoundException,
  Logger,
  InternalServerErrorException,
  ForbiddenException,
} from '@nestjs/common';
import * as usersRepository from '../repositories/users.repository';
import * as reportsRepository from '../repositories/reports.repository';
import { SajuService } from '../saju/saju.service';
import { toDate } from 'date-fns-tz';
import { generateRandomString } from '../utils/string';
import { Prisma } from '../../prisma/generated/prisma/client';
import { BaziCalculator } from '@aharris02/bazi-calculator-by-alvamind';
import { BaziDataExtractor } from '../saju/utils/baziExtractor.util';
import { getElementEmoji } from '../forecast/utils/elementEmojis.config';

@Injectable()
export class MeService {
  private readonly logger = new Logger(MeService.name);

  constructor(private readonly sajuService: SajuService) {}

  async getProfile(userId: string) {
    // Fetch user data
    const user = await usersRepository.findById(userId);

    if (!user) {
      throw new NotFoundException('user_not_found');
    }

    // Convert stored date to proper timezone-aware Date object
    // The DB stores as UTC, but we need to interpret it as local time in the birth timezone
    // Use date-fns-tz's toDate to create a proper timezone-aware Date object
    const birthDateString = user.birthDate.toISOString().split('.')[0]; // Remove milliseconds and Z
    const birthDate = toDate(birthDateString, { timeZone: user.birthTimezone });

    // Get basic profile (fast, no LLM calls)
    const profile = await this.sajuService.getBasicProfile(
      birthDate,
      user.gender,
      user.birthTimezone,
      user.isTimeKnown,
      user.currentTimezone,
    );

    // Get "Who You Are" content - return full paragraphs, frontend decides how to display
    // Build user context to get whoYouAre content
    const baseCalculator = new BaziCalculator(
      birthDate,
      user.gender,
      user.birthTimezone,
      user.isTimeKnown,
    );
    const baseAnalysis = baseCalculator.getCompleteAnalysis();
    if (!baseAnalysis) {
      throw new Error('Failed to get complete analysis');
    }
    const userContext = BaziDataExtractor.buildUserContext(baseAnalysis);
    const identity = this.sajuService.generateIdentity(userContext);
    const whoYouAre = this.sajuService.getWhoYouAreContent(
      identity.code,
      userContext,
    );
    const dayMasterElement = `${identity.element}-${identity.polarity === 'Yin' ? 'I' : 'O'}`;

    // Get element emoji
    const elementEmoji = getElementEmoji(identity.element as any);

    // Return combined profile with name and full who you are content
    return {
      name: user.fullName, // User's name at top level
      user: {
        id: user.id,
        fullName: user.fullName,
        gender: user.gender,
        birthDate: user.birthDate,
        birthLocation: user.birthLocation,
        birthTimezone: user.birthTimezone,
        currentLocation: user.currentLocation,
        currentTimezone: user.currentTimezone,
        isTimeKnown: user.isTimeKnown,
        code: user.code,
      },
      whoYouAre: {
        element: dayMasterElement,
        emoji: elementEmoji,
        paragraphs: whoYouAre.paragraphs, // Full paragraphs - frontend decides display
      },
      ...profile,
    };
  }
  async getPersonalReport(userId: string) {
    // Fetch user data
    const user = await usersRepository.findById(userId);

    if (!user) {
      throw new NotFoundException('user_not_found');
    }

    if (!user.accountId) {
      throw new ForbiddenException('account_not_found');
    }

    // Prepare input data for comparison
    const birthDateString = user.birthDate.toISOString().split('.')[0];
    const inputData = {
      birthDateTime: birthDateString,
      gender: user.gender,
      birthTimezone: user.birthTimezone,
      isTimeKnown: user.isTimeKnown,
    };

    // Check for existing report with same input
    // const existingReport =
    //   await reportsRepository.findPersonalReportByUserIdAndInput(
    //     user.id,
    //     inputData,
    //   );

    // if (existingReport) {
    //   return existingReport;
    // }

    // Generate unique code for this report
    const code = await this.generateUniqueCode();

    // Create report record (using UncheckedCreateInput to set accountId directly)
    const reportData: Prisma.ReportUncheckedCreateInput = {
      type: 'personal',
      status: 'in_progress',
      code,
      data: {},
      input: inputData,
      userId: user.id,
    };

    let report = await reportsRepository.createReport(reportData);

    try {
      // Convert stored date to proper timezone-aware Date object
      const localBirthTime = toDate(birthDateString, {
        timeZone: user.birthTimezone,
      });

      // Generate full personal analysis (includes LLM calls)
      const personalAnalysis = await this.sajuService.getPersonalAnalysis(
        localBirthTime,
        user.gender,
        user.birthTimezone,
        user.isTimeKnown,
      );

      // Get current and next luck cycles
      const luckCycles = await this.sajuService.getLuckCycles(
        localBirthTime,
        user.gender,
        user.birthTimezone,
        user.isTimeKnown,
        user.currentTimezone || user.birthTimezone, // Use currentTimezone if available, otherwise use birthTimezone
      );

      // Combine personal analysis with luck cycles
      const reportData = {
        ...personalAnalysis,
        luckCycles,
        name: user.fullName, // Include user's name in the report
      };

      // Update report with analysis data
      await reportsRepository.updateReport(report.id, {
        status: 'completed',
        data: JSON.parse(JSON.stringify(reportData)),
      });

      report = await reportsRepository.getReport(report.id);

      return report;
    } catch (error) {
      // Mark report as failed
      this.logger.error(`❌ Report generation failed: ${error.message}`);
      await reportsRepository.updateReport(report.id, {
        status: 'failed',
        data: { error: error.message },
      });

      throw new InternalServerErrorException(error.message);
    }
  }

  private async generateUniqueCode(): Promise<string> {
    let attempts = 0;
    const maxAttempts = 10;
    while (attempts < maxAttempts) {
      const code = generateRandomString(6);
      const existingReport = await reportsRepository.findByCode(code);
      if (!existingReport) {
        return code;
      }
      attempts++;
    }
    throw new Error('failed_to_generate_unique_code');
  }
}
