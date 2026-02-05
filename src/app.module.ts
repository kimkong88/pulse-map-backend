import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { ConfigModule } from '@nestjs/config';
import { ReportsModule } from './reports/reports.module';
import { AuthModule } from './auth/auth.module';
import { UsersModule } from './users/users.module';
import { MeModule } from './me/me.module';
import { QuestionsModule } from './questions/questions.module';
import { CommonModule } from './common/common.module';
import { FriendsModule } from './friends/friends.module';
import { BlessingsModule } from './blessings/blessings.module';
import { ForecastModule } from './forecast/forecast.module';
import { SubscriptionsModule } from './subscriptions/subscriptions.module';

@Module({
  imports: [
    ConfigModule.forRoot(),
    CommonModule,
    ReportsModule,
    AuthModule,
    UsersModule,
    MeModule,
    QuestionsModule,
    FriendsModule,
    BlessingsModule,
    ForecastModule,
    SubscriptionsModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
