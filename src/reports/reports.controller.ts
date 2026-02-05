import { Body, Controller, Param, Post, Get, UseGuards } from '@nestjs/common';
import { ReportsService } from './reports.service';
import {
  CreatePersonalReportDto,
  CreateCompatibilityReportDto,
} from './reports.dto';
import { AuthGuard } from '../guards/authGuard';
import { UserContext } from '../decorators/userContext';
import { addDays } from 'date-fns';

@Controller('reports')
export class ReportsController {
  constructor(private readonly reportsService: ReportsService) {}

  @Post('personal')
  createPersonalReport(
    @Body() createPersonalReportDto: CreatePersonalReportDto,
  ) {
    return this.reportsService.createPersonalReport(createPersonalReportDto);
  }

  @Post('compatibility')
  createCompatibilityReport(
    @Body() createCompatibilityReportDto: CreateCompatibilityReportDto,
  ) {
    return this.reportsService.createCompatibilityReport(
      createCompatibilityReportDto,
    );
  }

  @UseGuards(AuthGuard)
  @Get('today')
  getTodayForecastReport(
    @UserContext() userContext: { user: { id: string } },
  ) {
    // Returns existing report or { status: "pending" } if not found (200 OK)
    return this.reportsService.getForecastReport(
      userContext.user.id,
      'today',
    );
  }

  @UseGuards(AuthGuard)
  @Post('today')
  createTodayForecastReport(
    @UserContext() userContext: { user: { id: string } },
  ) {
    // Returns existing report if found, otherwise triggers generation and returns pending
    return this.reportsService.createForecastReport(
      userContext.user.id,
      'today',
    );
  }

  @UseGuards(AuthGuard)
  @Get('tomorrow')
  getTomorrowForecastReport(
    @UserContext() userContext: { user: { id: string } },
  ) {
    // Returns existing report or { status: "pending" } if not found (200 OK)
    return this.reportsService.getForecastReport(
      userContext.user.id,
      'tomorrow',
    );
  }

  @UseGuards(AuthGuard)
  @Post('tomorrow')
  createTomorrowForecastReport(
    @UserContext() userContext: { user: { id: string } },
  ) {
    // Returns existing report if found, otherwise triggers generation and returns pending
    return this.reportsService.createForecastReport(
      userContext.user.id,
      'tomorrow',
    );
  }

  @UseGuards(AuthGuard)
  @Get('compatibility/:person2Code')
  getCompatibilityReport(
    @UserContext() userContext: { user: { id: string } },
    @Param('person2Code') person2Code: string,
  ) {
    // Returns existing report or { status: "pending" } if not found (200 OK)
    return this.reportsService.getCompatibilityReport(
      userContext.user.id,
      person2Code,
    );
  }

  @UseGuards(AuthGuard)
  @Get('14day')
  get14DayForecastReport(
    @UserContext() userContext: { user: { id: string } },
  ) {
    // Returns existing report or { status: "pending" } if not found (200 OK)
    return this.reportsService.get14DayForecastReport(userContext.user.id);
  }

  @UseGuards(AuthGuard)
  @Post('14day')
  create14DayForecastReport(
    @UserContext() userContext: { user: { id: string } },
  ) {
    // Returns existing report if found, otherwise triggers generation and returns pending
    return this.reportsService.create14DayForecastReport(userContext.user.id);
  }

  @Get(':code')
  getReportByCode(@Param('code') code: string) {
    return this.reportsService.getReportByCode(code);
  }
}
