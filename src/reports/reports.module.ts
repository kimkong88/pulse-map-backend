import { Module } from '@nestjs/common';
import { ReportsService } from './reports.service';
import { ReportsController } from './reports.controller';
import { SajuModule } from '../saju/saju.module';

@Module({
  imports: [SajuModule],
  controllers: [ReportsController],
  providers: [ReportsService],
})
export class ReportsModule {}
