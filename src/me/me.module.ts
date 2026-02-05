import { Module } from '@nestjs/common';
import { MeService } from './me.service';
import { MeController } from './me.controller';
import { SajuModule } from '../saju/saju.module';
import { AuthModule } from '../auth/auth.module';

@Module({
  imports: [SajuModule, AuthModule],
  controllers: [MeController],
  providers: [MeService],
  exports: [MeService],
})
export class MeModule {}
