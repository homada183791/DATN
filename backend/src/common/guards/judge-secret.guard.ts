import { Injectable, CanActivate, ExecutionContext, ForbiddenException } from '@nestjs/common';

@Injectable()
export class JudgeSecretGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest();
    const secret = request.headers['x-judge-secret'];

    const expectedSecret = process.env.JUDGE_SECRET || 'default-judge-secret-key';

    if (!secret || secret !== expectedSecret) {
      throw new ForbiddenException('Invalid Judge Secret Key');
    }

    return true;
  }
}
