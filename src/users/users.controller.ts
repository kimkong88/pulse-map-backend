import { Body, Controller, Delete, Get, Param, Post } from '@nestjs/common';
import { CreateUserDto, SwitchUserDto } from './users.dto';
import { UsersService } from './users.service';
import { OptionalAuthGuard } from '../guards/optionalAuthGuard';
import { UseGuards } from '@nestjs/common';
import { UserContext } from '../decorators/userContext';
import { Account, User } from '../../prisma/generated/prisma/client';
import { AuthGuard } from '../guards/authGuard';

@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Post()
  @UseGuards(OptionalAuthGuard)
  createUser(
    @Body() createUserDto: CreateUserDto,
    @UserContext() userContext: { account: Account },
  ) {
    return this.usersService.createUser(
      createUserDto,
      userContext?.account?.id,
    );
  }

  @Get('me')
  @UseGuards(AuthGuard)
  getMe(@UserContext() context: { user: { id: string } }) {
    return this.usersService.getUser(context.user.id);
  }

  @Get(':code')
  getUserByCode(@Param('code') code: string) {
    return this.usersService.getUserByCode(code);
  }

  @Get()
  @UseGuards(AuthGuard)
  getUsers(@UserContext() context: { user: User; account: { id: string } }) {
    return this.usersService.getUsersByAccountId(
      context.user,
      context.account?.id,
    );
  }

  @Post('switch')
  @UseGuards(AuthGuard)
  switch(
    @Body() switchDto: SwitchUserDto,
    @UserContext() context: { account: { id: string } },
  ) {
    return this.usersService.switchUser(switchDto.userId, context.account.id);
  }

  @Delete(':id')
  @UseGuards(AuthGuard)
  deleteUser(
    @Param('id') userId: string,
    @UserContext() context: { account: { id: string }; user: { id: string } },
  ) {
    return this.usersService.deleteUser(
      userId,
      context.account.id,
      context.user.id,
    );
  }
}
