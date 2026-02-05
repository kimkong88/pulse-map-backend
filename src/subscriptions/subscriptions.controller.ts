import { Controller, Get, Post, UseGuards } from '@nestjs/common';
import { SubscriptionsService } from './subscriptions.service';
import { AuthGuard } from '../guards/authGuard';
import { UserContext } from '../decorators/userContext';

@Controller('subscriptions')
export class SubscriptionsController {
  constructor(private readonly subscriptionsService: SubscriptionsService) {}

  @UseGuards(AuthGuard)
  @Get()
  async getSubscription(@UserContext() context: { user: { id: string } }) {
    return this.subscriptionsService.getSubscriptionStatus(context.user.id);
  }

  @UseGuards(AuthGuard)
  @Post()
  async addSubscription(@UserContext() context: { user: { id: string } }) {
    return this.subscriptionsService.addOneMonthSubscription(context.user.id);
  }
}
