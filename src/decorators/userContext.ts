import { ExecutionContext } from '@nestjs/common';

import { createParamDecorator } from '@nestjs/common';

export const UserContext = createParamDecorator(
  (_data, ctx: ExecutionContext) => {
    const request = ctx.switchToHttp().getRequest();

    return {
      account: request.account,
      user: request.user,
    };
  },
);
