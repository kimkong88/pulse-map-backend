import { Body, Controller, Get, Post, UseGuards } from '@nestjs/common';
import { BlessingsService } from './blessings.service';
import { AuthGuard } from '../guards/authGuard';
import { UserContext } from '../decorators/userContext';
import { SendBlessingDto } from './blessings.dto';

@Controller('blessings')
export class BlessingsController {
  constructor(private readonly blessingsService: BlessingsService) {}

  @UseGuards(AuthGuard)
  @Get('availability')
  async checkAvailability(
    @UserContext() context: { user: { id: string } },
  ) {
    return this.blessingsService.checkAvailability(context.user.id);
  }

  @UseGuards(AuthGuard)
  @Get('active')
  async getActiveBlessings(
    @UserContext() context: { user: { id: string } },
  ) {
    return this.blessingsService.getActiveBlessings(context.user.id);
  }

  @UseGuards(AuthGuard)
  @Get()
  async getAllBlessings(@UserContext() context: { user: { id: string } }) {
    return this.blessingsService.getAllBlessings(context.user.id);
  }

  @UseGuards(AuthGuard)
  @Post()
  async sendBlessing(
    @UserContext() context: { user: { id: string } },
    @Body() sendBlessingDto: SendBlessingDto,
  ) {
    return this.blessingsService.sendBlessing(
      context.user.id,
      sendBlessingDto,
    );
  }
}
