import { Module } from '@nestjs/common';
import { AuthService } from './auth.service';
import { AuthController } from './auth.controller';
import { TokensModule } from '../tokens/tokens.module';
import { AuthGuard } from 'src/guards/authGuard';
import { OptionalAuthGuard } from 'src/guards/optionalAuthGuard';

@Module({
  imports: [TokensModule],
  controllers: [AuthController],
  providers: [AuthService, AuthGuard, OptionalAuthGuard],
  exports: [AuthService, AuthGuard, OptionalAuthGuard],
})
export class AuthModule {}
