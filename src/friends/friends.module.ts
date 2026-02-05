import { Module } from '@nestjs/common';
import { FriendsService } from './friends.service';
import { FriendsController } from './friends.controller';
import { UsersModule } from '../users/users.module';
import { SajuModule } from '../saju/saju.module';
import { AuthModule } from '../auth/auth.module';

@Module({
  imports: [UsersModule, SajuModule, AuthModule],
  controllers: [FriendsController],
  providers: [FriendsService],
  exports: [FriendsService],
})
export class FriendsModule {}
