import { Module } from '@nestjs/common';
import { ForecastService } from './forecast.service';
import { ForecastController } from './forecast.controller';
import { SajuModule } from '../saju/saju.module';
import { AuthModule } from '../auth/auth.module';

@Module({
  imports: [SajuModule, AuthModule],
  providers: [ForecastService],
  controllers: [ForecastController],
  exports: [ForecastService],
})
export class ForecastModule {}
