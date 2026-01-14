import {
  Injectable,
  InternalServerErrorException,
  NotFoundException,
} from '@nestjs/common';
import {
  CreatePersonalReportDto,
  CreateCompatibilityReportDto,
} from './reports.dto';
import * as reportsRepository from '../repositories/reports.repository';
import { SajuService } from '../saju/saju.service';
import { generateRandomString } from '../utils/string';
import { getTimezoneOffset } from 'date-fns-tz';
import * as fs from 'fs';
import * as path from 'path';

@Injectable()
export class ReportsService {
  constructor(private readonly sajuService: SajuService) {}

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
      // Frontend sends "1988-06-11T19:00:00.000Z" meaning June 11 7PM in target timezone (NOT UTC!)
      // The BaziCalculator interprets the Date's UTC time IN the target timezone
      // So if Seoul time is 19:00, and Seoul is UTC+9, we need to send 10:00 UTC
      // We use date-fns-tz to get the offset dynamically (handles DST automatically)

      const inputDate = createPersonalReportDto.birthDateTime;
      const targetTimezone = createPersonalReportDto.birthTimezone;

      // Get the timezone offset in milliseconds for this date in the target timezone
      const offsetMillis = getTimezoneOffset(targetTimezone, inputDate);

      // Subtract the offset from the input to get the correct UTC time
      const inputTimestamp = inputDate.getTime();
      const correctedTimestamp = inputTimestamp - offsetMillis;
      const localBirthTime = new Date(correctedTimestamp);

      const personalAnalysis = await this.sajuService.getPersonalAnalysis(
        localBirthTime,
        createPersonalReportDto.gender,
        createPersonalReportDto.birthTimezone,
        createPersonalReportDto.isTimeKnown,
      );

      await reportsRepository.updateReport(report.id, {
        status: 'completed',
        data: JSON.parse(JSON.stringify(personalAnalysis)),
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
    // DEBUGGING MODE: Skip database, return plain object
    const DEBUG_MODE = process.env.DEBUG_MODE === 'true';

    if (DEBUG_MODE) {
      // Apply timezone correction for Person 1
      const person1Input = createCompatibilityReportDto.person1;
      const offset1 = getTimezoneOffset(
        person1Input.birthTimezone,
        person1Input.birthDateTime,
      );
      const corrected1 = new Date(
        person1Input.birthDateTime.getTime() - offset1,
      );

      // Apply timezone correction for Person 2
      const person2Input = createCompatibilityReportDto.person2;
      const offset2 = getTimezoneOffset(
        person2Input.birthTimezone,
        person2Input.birthDateTime,
      );
      const corrected2 = new Date(
        person2Input.birthDateTime.getTime() - offset2,
      );

      // Generate compatibility analysis (plain object)
      const compatibilityAnalysis =
        await this.sajuService.getCompatibilityAnalysis(
          {
            birthDateTime: corrected1,
            gender: person1Input.gender,
            birthTimezone: person1Input.birthTimezone,
            isTimeKnown: person1Input.isTimeKnown,
          },
          {
            birthDateTime: corrected2,
            gender: person2Input.gender,
            birthTimezone: person2Input.birthTimezone,
            isTimeKnown: person2Input.isTimeKnown,
          },
        );

      // DEBUG: Save to JSON file for inspection
      const outputPath = path.join(
        process.cwd(),
        'compatibility-analysis-output.json',
      );
      fs.writeFileSync(
        outputPath,
        JSON.stringify(compatibilityAnalysis, null, 2),
        'utf-8',
      );
      console.log(`\n✅ Compatibility report saved to: ${outputPath}\n`);

      return compatibilityAnalysis; // Return plain object, no database
    }

    // PRODUCTION MODE: Full database operations
    const code = await this.generateUniqueCode();
    const isTeaser = createCompatibilityReportDto.isTeaser ?? true; // Default to free version

    let report = await reportsRepository.createReport({
      type: 'compatibility',
      status: 'in_progress',
      code,
      data: {},
      input: JSON.parse(JSON.stringify(createCompatibilityReportDto)),
    });

    try {
      // Apply timezone correction for Person 1
      const person1Input = createCompatibilityReportDto.person1;
      const offset1 = getTimezoneOffset(
        person1Input.birthTimezone,
        person1Input.birthDateTime,
      );
      const corrected1 = new Date(
        person1Input.birthDateTime.getTime() - offset1,
      );

      // Apply timezone correction for Person 2
      const person2Input = createCompatibilityReportDto.person2;
      const offset2 = getTimezoneOffset(
        person2Input.birthTimezone,
        person2Input.birthDateTime,
      );
      const corrected2 = new Date(
        person2Input.birthDateTime.getTime() - offset2,
      );

      // Generate compatibility analysis
      const compatibilityAnalysis =
        await this.sajuService.getCompatibilityAnalysis(
          {
            birthDateTime: corrected1,
            gender: person1Input.gender,
            birthTimezone: person1Input.birthTimezone,
            isTimeKnown: person1Input.isTimeKnown,
          },
          {
            birthDateTime: corrected2,
            gender: person2Input.gender,
            birthTimezone: person2Input.birthTimezone,
            isTimeKnown: person2Input.isTimeKnown,
          },
        );

      // TODO: When implementing premium version, filter data based on isTeaser flag
      // For now, we only have teaser version implemented
      const reportData = isTeaser
        ? compatibilityAnalysis // Teaser version (current implementation)
        : compatibilityAnalysis; // Premium version (TODO: implement expanded version)

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
}
