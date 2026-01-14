import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { ConfigModule } from '@nestjs/config';
import { ReportsModule } from './reports/reports.module';

@Module({
  imports: [ConfigModule.forRoot(), ReportsModule],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
