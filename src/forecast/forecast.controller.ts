import { Controller, Get, UseGuards } from '@nestjs/common';
import { ForecastService } from './forecast.service';
import { AuthGuard } from '../guards/authGuard';
import { UserContext } from '../decorators/userContext';

@Controller('forecasts')
export class ForecastController {
  constructor(private readonly forecastService: ForecastService) {}

  @UseGuards(AuthGuard)
  @Get('today')
  async getTodayForecast(@UserContext() userContext: { user: { id: string } }) {
    return this.forecastService.getTodayForecast(userContext.user.id);
  }
}
