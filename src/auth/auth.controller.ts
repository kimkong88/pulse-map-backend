import { Body, Controller, Post, UseGuards } from '@nestjs/common';
import { AuthService } from './auth.service';
import { AuthenticateDto, RefreshDto } from './auth.dto';
import { OptionalAuthGuard } from '../guards/optionalAuthGuard';
import { UserContext } from '../decorators/userContext';

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @UseGuards(OptionalAuthGuard)
  @Post('authenticate')
  authenticate(
    @Body() authenticateDto: AuthenticateDto,
    @UserContext() context?: { user: { id: string } },
  ) {
    // If authenticated (has user context) → Sign up flow (link ghost user to account)
    // If not authenticated → Sign in flow (authenticate existing account)
    return this.authService.authenticate(authenticateDto, context?.user?.id);
  }

  @Post('refresh')
  refresh(@Body() refreshDto: RefreshDto) {
    return this.authService.refreshTokens(refreshDto.refreshToken);
  }

}
