import { ExtractJwt, Strategy } from 'passport-jwt';
import { PassportStrategy } from '@nestjs/passport';
import { Injectable } from '@nestjs/common';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor() {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: process.env.JWT_SECRET || 'super-secret-key-for-dev',
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
