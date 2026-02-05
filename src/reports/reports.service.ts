import {
  Injectable,
  InternalServerErrorException,
  NotFoundException,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import {
  CreatePersonalReportDto,
  CreateCompatibilityReportDto,
} from './reports.dto';
import * as reportsRepository from '../repositories/reports.repository';
import * as usersRepository from '../repositories/users.repository';
import * as friendsRepository from '../repositories/friends.repository';
import { SajuService } from '../saju/saju.service';
import { ForecastService } from '../forecast/forecast.service';
import { UsersService } from '../users/users.service';
import { generateRandomString } from '../utils/string';
import { toDate, formatInTimeZone } from 'date-fns-tz';
import { addDays } from 'date-fns';

@Injectable()
export class ReportsService {
  private readonly logger = new Logger(ReportsService.name);

  constructor(
    private readonly sajuService: SajuService,
    private readonly forecastService: ForecastService,
    private readonly usersService: UsersService,
  ) {}

  async createPersonalReport(createPersonalReportDto: CreatePersonalReportDto) {
    const code = await this.generateUniqueCode();
    let report = await reportsRepository.createReport({
      type: 'personal',
      status: 'in_progress',
      code,
      data: {},
      input: { ...createPersonalReportDto },
    });
    try {
      // Frontend sends birthDateTime as ISO string without timezone (e.g., "1988-06-11T19:00:00")
      // This represents the local time at birth
      // We use date-fns-tz's toDate() to create a proper timezone-aware Date object
      const localBirthTime = toDate(createPersonalReportDto.birthDateTime, {
        timeZone: createPersonalReportDto.birthTimezone,
      });

      const personalAnalysis = await this.sajuService.getPersonalAnalysis(
        localBirthTime,
        createPersonalReportDto.gender,
        createPersonalReportDto.birthTimezone,
        createPersonalReportDto.isTimeKnown,
      );

      // Get current and next luck cycles
      const luckCycles = await this.sajuService.getLuckCycles(
        localBirthTime,
        createPersonalReportDto.gender,
        createPersonalReportDto.birthTimezone,
        createPersonalReportDto.isTimeKnown,
        createPersonalReportDto.birthTimezone, // Use birthTimezone as currentTimezone for reports
      );

      // Combine personal analysis with luck cycles
      const reportData = {
        ...personalAnalysis,
        luckCycles,
        ...(createPersonalReportDto.name && { name: createPersonalReportDto.name }), // Include name if provided
      };

      await reportsRepository.updateReport(report.id, {
        status: 'completed',
        data: JSON.parse(JSON.stringify(reportData)),
      });

      return reportsRepository.getReport(report.id);
    } catch (error) {
      await reportsRepository.updateReport(report.id, {
        status: 'failed',
        data: { error: error.message },
      });
      throw new InternalServerErrorException(error.message);
    }
  }

  async createCompatibilityReport(
    createCompatibilityReportDto: CreateCompatibilityReportDto,
  ) {
    // Find person1 by code
    const person1 = await usersRepository.findByCode(
      createCompatibilityReportDto.person1.code,
    );
    if (!person1) {
      throw new NotFoundException('Person1 not found');
    }

    // Find or create person2
    let person2;
    let person2Tokens = null; // Store tokens if user is created
    const person2Data = createCompatibilityReportDto.person2;
    const isPerson2Created = !person2Data.code; // Track if we're creating a new user
    
    if (person2Data.code) {
      // If code provided, fetch existing user
      person2 = await usersRepository.findByCode(person2Data.code);
      if (!person2) {
        throw new NotFoundException('Person2 not found');
      }
    } else {
      // Create person2 as a new user (ghost user, no accountId)
      const { user, tokens } = await this.usersService.createUser(
        {
          fullName: person2Data.fullName || 'Anonymous',
          gender: person2Data.gender,
          birthDate: person2Data.birthDateTime,
          birthLocation: person2Data.birthLocation,
          birthTimezone: person2Data.birthTimezone,
          currentLocation: person2Data.currentLocation,
          currentTimezone: person2Data.currentTimezone,
          isTimeKnown: person2Data.isTimeKnown,
        },
        undefined, // No accountId for friend users (ghost users)
      );
      person2 = user;
      person2Tokens = tokens;
    }

    // Add person1 as a friend to person2's profile (skip if already exists)
    const existingRelationship = await friendsRepository.findFriendRelationship(
      person2.id,
      person1.id,
    );
    if (!existingRelationship) {
      await friendsRepository.addFriend({
        user: { connect: { id: person2.id } },
        friend: { connect: { id: person1.id } },
        relationship: 'friend', // Default relationship type
      });
    }

    // Build report input with both persons' full data including codes
    const reportInput = {
      person1: {
        code: person1.code,
        birthDateTime: person1.birthDate.toISOString().split('.')[0], // Remove milliseconds and Z
        gender: person1.gender,
        birthLocation: person1.birthLocation,
        birthTimezone: person1.birthTimezone,
        currentLocation: person1.currentLocation,
        currentTimezone: person1.currentTimezone,
        isTimeKnown: person1.isTimeKnown,
      },
      person2: {
        code: person2.code,
        birthDateTime: person2.birthDate.toISOString().split('.')[0], // Remove milliseconds and Z
        gender: person2.gender,
        birthLocation: person2.birthLocation,
        birthTimezone: person2.birthTimezone,
        currentLocation: person2.currentLocation,
        currentTimezone: person2.currentTimezone,
        isTimeKnown: person2.isTimeKnown,
      },
      isTeaser: createCompatibilityReportDto.isTeaser ?? true,
    };

    // Check for existing report with matching input data (normal order) - any status
    const existingReport = await reportsRepository.findCompatibilityReportByInputAnyStatus(
      reportInput,
    );

    // If existing report found, return early (any status)
    if (existingReport) {
      this.logger.log('Found existing compatibility report, returning early...');
      // Return existing report with appropriate structure
      if (isPerson2Created && person2Tokens) {
        return {
          user: person2,
          tokens: person2Tokens,
          report: existingReport,
        };
      }
      return { report: existingReport };
    }

    // No report exists - create it and return with in_progress status
    // Then process in background
    this.logger.log('No existing report found, creating new one...');
    const code = await this.generateUniqueCode();

    const report = await reportsRepository.createReport({
      type: 'compatibility',
      status: 'in_progress',
      code,
      data: {},
      input: JSON.parse(JSON.stringify(reportInput)), // Store both persons' full data with codes
    });

    // Process in background (don't await) - will update status to completed or failed
    this.processCompatibilityReport(
      report.id,
      reportInput,
      createCompatibilityReportDto.isTeaser ?? true,
    ).catch((error) => {
      this.logger.error(
        `Failed to process compatibility report ${report.id}: ${error.message}`,
        error.stack,
      );
    });

    // Return report with in_progress status immediately (processing happens in background)
    if (isPerson2Created && person2Tokens) {
      return {
        user: person2,
        tokens: person2Tokens,
        report,
      };
    }
    return { report };
  }

  /**
   * Background processing for compatibility report
   */
  private async processCompatibilityReport(
    reportId: string,
    reportInput: {
      person1: {
        code: string;
        birthDateTime: string;
        gender: 'male' | 'female';
        birthTimezone: string;
        isTimeKnown: boolean;
      };
      person2: {
        code: string;
        birthDateTime: string;
        gender: 'male' | 'female';
        birthTimezone: string;
        isTimeKnown: boolean;
      };
      isTeaser?: boolean;
    },
    isTeaser: boolean,
  ) {
    try {
      this.logger.log(`Starting compatibility analysis generation for report ${reportId}...`);
      
      // Convert ISO string to timezone-aware Date for Person 1
      const corrected1 = toDate(reportInput.person1.birthDateTime, {
        timeZone: reportInput.person1.birthTimezone,
      });

      // Convert ISO string to timezone-aware Date for Person 2
      const corrected2 = toDate(reportInput.person2.birthDateTime, {
        timeZone: reportInput.person2.birthTimezone,
      });

      // Generate compatibility analysis
      this.logger.log('Calling sajuService.getCompatibilityAnalysis...');
      const compatibilityAnalysis =
        await this.sajuService.getCompatibilityAnalysis(
          {
            birthDateTime: corrected1,
            gender: reportInput.person1.gender,
            birthTimezone: reportInput.person1.birthTimezone,
            isTimeKnown: reportInput.person1.isTimeKnown,
          },
          {
            birthDateTime: corrected2,
            gender: reportInput.person2.gender,
            birthTimezone: reportInput.person2.birthTimezone,
            isTimeKnown: reportInput.person2.isTimeKnown,
          },
        );

      // TODO: When implementing premium version, filter data based on isTeaser flag
      // For now, we only have teaser version implemented
      const reportData = isTeaser
        ? compatibilityAnalysis // Teaser version (current implementation)
        : compatibilityAnalysis; // Premium version (TODO: implement expanded version)

      // Convert Date objects to ISO strings for JSON serialization
      const serializedData = JSON.parse(
        JSON.stringify(reportData, (key, value) => {
          if (value instanceof Date) {
            return value.toISOString();
          }
          return value;
        }),
      );

      await reportsRepository.updateReport(reportId, {
        status: 'completed',
        data: serializedData,
      });

      this.logger.log(`Compatibility report ${reportId} completed successfully`);
    } catch (error) {
      this.logger.error(
        `Failed to process compatibility report ${reportId}: ${error.message}`,
        error.stack,
      );

      // Update report with failed status
      await reportsRepository.updateReport(reportId, {
        status: 'failed',
        data: { error: error.message },
      });
    }
  }

  async getReportByCode(code: string) {
    const report = await reportsRepository.findByCode(code);
    if (!report) {
      throw new NotFoundException('Report not found');
    }
    return report;
  }

  async generateUniqueCode() {
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

  /**
   * Get forecast report (today or tomorrow)
   * Returns existing report if found, or { status: "pending" } if not found (200 OK)
   */
  async getForecastReport(
    userId: string,
    dateType: 'today' | 'tomorrow',
  ) {
    // Get user
    const user = await usersRepository.findById(userId);
    if (!user) {
      throw new NotFoundException('User not found');
    }

    // Get user's current timezone (fallback to birthTimezone)
    const currentTimezone = user.currentTimezone || user.birthTimezone;

    // Calculate target date in user's timezone
    const now = new Date();
    const targetDate =
      dateType === 'today'
        ? toDate(formatInTimeZone(now, currentTimezone, 'yyyy-MM-dd'), {
            timeZone: currentTimezone,
          })
        : toDate(
            formatInTimeZone(addDays(now, 1), currentTimezone, 'yyyy-MM-dd'),
            { timeZone: currentTimezone },
          );

    // Format target date as YYYY-MM-DD for lookup
    const targetDateString = formatInTimeZone(
      targetDate,
      currentTimezone,
      'yyyy-MM-dd',
    );

    // Check if report already exists for this user and date
    const existingReport = await reportsRepository.findForecastReportByUserIdAndDate(
      user.id,
      targetDateString,
    );

    if (existingReport) {
      // Return existing report (could be pending, in_progress, completed, or failed)
      return existingReport;
    }

    // No report exists - return pending status (200 OK, not 404)
    return {
      status: 'pending',
    };
  }

  /**
   * Create or get forecast report (today or tomorrow)
   * Returns existing report if found, otherwise creates pending report and processes in background
   */
  async createForecastReport(
    userId: string,
    dateType: 'today' | 'tomorrow',
  ) {
    // Get user
    const user = await usersRepository.findById(userId);
    if (!user) {
      throw new NotFoundException('User not found');
    }

    // Get user's current timezone (fallback to birthTimezone)
    const currentTimezone = user.currentTimezone || user.birthTimezone;

    // Calculate target date in user's timezone
    const now = new Date();
    const targetDate =
      dateType === 'today'
        ? toDate(formatInTimeZone(now, currentTimezone, 'yyyy-MM-dd'), {
            timeZone: currentTimezone,
          })
        : toDate(
            formatInTimeZone(addDays(now, 1), currentTimezone, 'yyyy-MM-dd'),
            { timeZone: currentTimezone },
          );

    // Format target date as YYYY-MM-DD for lookup
    const targetDateString = formatInTimeZone(
      targetDate,
      currentTimezone,
      'yyyy-MM-dd',
    );

    // Check if report already exists for this user and date
    const existingReport = await reportsRepository.findForecastReportByUserIdAndDate(
      user.id,
      targetDateString,
    );

    if (existingReport) {
      // Return existing report (could be pending, in_progress, completed, or failed)
      return existingReport;
    }

    // No report exists - create it and return with pending status
    // Then process in background
    const code = await this.generateUniqueCode();
    const report = await reportsRepository.createReport({
      type: 'forecast',
      status: 'pending',
      code,
      data: {},
      input: {
        userId: user.id,
        targetDate: targetDateString,
        currentTimezone: user.currentTimezone || user.birthTimezone,
      },
      userId: user.id,
    });

    // Process in background (don't await) - will update status to in_progress then completed
    this.processForecastReport(report.id, user.id, targetDate).catch(
      (error) => {
        this.logger.error(
          `Failed to process forecast report ${report.id}: ${error.message}`,
          error.stack,
        );
      },
    );

    // Return report with pending status immediately (processing happens in background)
    return report;
  }

  /**
   * Background processing for forecast report
   */
  private async processForecastReport(
    reportId: string,
    userId: string,
    targetDate: Date,
  ) {
    try {
      // Update to in_progress status
      await reportsRepository.updateReport(reportId, {
        status: 'in_progress',
      });

      // Generate forecast using ForecastService (handles targetDate)
      const forecast = await this.forecastService.getForecastForDate(
        userId,
        targetDate,
      );

      // Update report with completed status and data
      await reportsRepository.updateReport(reportId, {
        status: 'completed',
        data: JSON.parse(JSON.stringify(forecast)),
      });

      this.logger.log(`Forecast report ${reportId} completed successfully`);
    } catch (error) {
      this.logger.error(
        `Failed to process forecast report ${reportId}: ${error.message}`,
        error.stack,
      );

      // Update report with failed status
      await reportsRepository.updateReport(reportId, {
        status: 'failed',
        data: { error: error.message },
      });
    }
  }

  async getCompatibilityReport(userId: string, person2Code: string) {
    // Get person1 (current user)
    const person1 = await usersRepository.findById(userId);
    if (!person1) {
      throw new NotFoundException('Person1 (current user) not found');
    }

    // Get person2 by code
    const person2 = await usersRepository.findByCode(person2Code);
    if (!person2) {
      throw new NotFoundException('Person2 not found');
    }

    // Build report input with both persons' full data including codes
    const reportInput = {
      person1: {
        code: person1.code,
        birthDateTime: person1.birthDate.toISOString().split('.')[0], // Remove milliseconds and Z
        gender: person1.gender,
        birthLocation: person1.birthLocation,
        birthTimezone: person1.birthTimezone,
        currentLocation: person1.currentLocation,
        currentTimezone: person1.currentTimezone,
        isTimeKnown: person1.isTimeKnown,
      },
      person2: {
        code: person2.code,
        birthDateTime: person2.birthDate.toISOString().split('.')[0], // Remove milliseconds and Z
        gender: person2.gender,
        birthLocation: person2.birthLocation,
        birthTimezone: person2.birthTimezone,
        currentLocation: person2.currentLocation,
        currentTimezone: person2.currentTimezone,
        isTimeKnown: person2.isTimeKnown,
      },
    };

    // Check for existing report with matching input data (normal order) - any status
    const existingReport = await reportsRepository.findCompatibilityReportByInputAnyStatus(
      reportInput,
    );

    if (existingReport) {
      return existingReport;
    }

    // No report exists - return pending status (200 OK, not 404)
    return {
      status: 'pending',
    };
  }

  /**
   * Get 14-day forecast report
   * Returns existing report if found, or { status: "pending" } if not found (200 OK)
   */
  async get14DayForecastReport(userId: string) {
    const existingReport = await reportsRepository.find14DayForecastReportByUserId(userId);

    if (existingReport) {
      return existingReport;
    }

    // No report exists - return pending status (200 OK, not 404)
    return {
      status: 'pending',
    };
  }

  /**
   * Create or get 14-day forecast report
   * Returns existing report if found, otherwise creates pending report and processes in background
   */
  async create14DayForecastReport(userId: string) {
    // Check if report already exists
    const existingReport = await reportsRepository.find14DayForecastReportByUserId(userId);

    if (existingReport) {
      // Return existing report (could be pending, in_progress, completed, or failed)
      return existingReport;
    }

    // Create new report with pending status
    const code = await this.generateUniqueCode();
    const report = await reportsRepository.createReport({
      type: 'forecast_14day',
      status: 'pending',
      code,
      data: {},
      input: { userId },
      userId,
    });

    // Process in background (don't await)
    this.process14DayForecastReport(report.id, userId).catch((error) => {
      this.logger.error(`Error processing 14-day forecast report ${report.id}:`, error);
    });

    // Return pending report immediately
    return report;
  }

  /**
   * Process 14-day forecast report in background
   */
  private async process14DayForecastReport(reportId: string, userId: string) {
    try {
      // Update status to in_progress
      await reportsRepository.updateReport(reportId, {
        status: 'in_progress',
      });

      // Generate 14-day forecast
      const forecastData = await this.forecastService.generate14DayForecast(userId);

      // Update report with completed data
      await reportsRepository.updateReport(reportId, {
        status: 'completed',
        data: JSON.parse(JSON.stringify(forecastData)),
      });

      this.logger.log(`✅ 14-day forecast report ${reportId} completed`);
    } catch (error) {
      this.logger.error(`Error processing 14-day forecast report ${reportId}:`, error);
      await reportsRepository.updateReport(reportId, {
        status: 'failed',
        data: { error: error.message },
      });
    }
  }
}
