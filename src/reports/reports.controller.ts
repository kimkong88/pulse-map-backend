import { Body, Controller, Param, Post, Get } from '@nestjs/common';
import { ReportsService } from './reports.service';
import {
  CreatePersonalReportDto,
  CreateCompatibilityReportDto,
} from './reports.dto';

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

  @Get(':code')
  getReportByCode(@Param('code') code: string) {
    return this.reportsService.getReportByCode(code);
  }
}
