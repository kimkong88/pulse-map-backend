import { Controller, Get, Post, UseGuards } from '@nestjs/common';
import { MeService } from './me.service';
import { AuthGuard } from '../guards/authGuard';
import { UserContext } from '../decorators/userContext';

@Controller('me')
export class MeController {
  constructor(private readonly meService: MeService) {}

  @UseGuards(AuthGuard)
  @Get()
  async getMe(@UserContext() context: { user: { id: string } }) {
    return this.meService.getProfile(context.user.id);
  }

  @UseGuards(AuthGuard)
  @Post()
  async getPersonalReport(@UserContext() context: { user: { id: string } }) {
    return this.meService.getPersonalReport(context.user.id);
  }
}
