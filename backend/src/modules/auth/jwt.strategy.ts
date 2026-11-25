import { ExtractJwt, Strategy } from 'passport-jwt';
import { PassportStrategy } from '@nestjs/passport';
import { Injectable } from '@nestjs/common';
import { requireSecret } from '../../common/config/secrets';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor() {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: requireSecret('JWT_SECRET'),
    });
  }

  validate(payload: { sub: string; email: string; role: string; username?: string }) {
    return {
      userId: payload.sub,
      email: payload.email,
      role: payload.role,
      username: payload.username,
    };
  }
}
