import { Module } from '@nestjs/common';
import { BlessingsController } from './blessings.controller';
import { BlessingsService } from './blessings.service';
import { SajuModule } from '../saju/saju.module';
import { AuthModule } from 'src/auth/auth.module';
import { SubscriptionsModule } from '../subscriptions/subscriptions.module';

@Module({
  imports: [SajuModule, AuthModule, SubscriptionsModule],
  controllers: [BlessingsController],
  providers: [BlessingsService],
  exports: [BlessingsService],
})
export class BlessingsModule {}
