import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import { JwtPayload } from '../types/request.types';
import { AuthenticatedRequest } from '../types/request.types';

export const CurrentUser = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext): JwtPayload => {
    const request = ctx.switchToHttp().getRequest<AuthenticatedRequest>();
    return request.user;
  },
);
