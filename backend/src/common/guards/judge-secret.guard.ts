import {
  Injectable,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
} from '@nestjs/common';
import { requireSecret, safeEqual } from '../config/secrets';

@Injectable()
export class JudgeSecretGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const request = context
      .switchToHttp()
      .getRequest<{ headers: Record<string, string> }>();
    const secret = request.headers['x-judge-secret'];

    if (!safeEqual(secret, requireSecret('JUDGE_SECRET'))) {
      throw new ForbiddenException('Invalid Judge Secret Key');
    }

    return true;
  }
}
