import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { AuthPayload } from '../interfaces/auth.interface';
import { UserService } from '../../users/services/user.service';
import { FncRoleService } from '../../fnc-roles/services/fnc-role.service';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(
    private readonly configService: ConfigService,
    private readonly userService: UserService,
    private readonly fncRoleService: FncRoleService,
  ) {
    const jwtSecret = configService.get<string>('JWT_SECRET');
    if (!jwtSecret) {
      throw new Error('JWT_SECRET is not defined');
    }
    
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: jwtSecret,
    });
  }

  async validate(payload: any): Promise<AuthPayload> {
    try {
      // Validate if user still exists
      const user = await this.userService.findById(payload.sub);
      if (!user) {
        throw new UnauthorizedException('User not found');
      }

      // Check if user is active
      if (user.status !== 'active') {
        throw new UnauthorizedException('User account is not active');
      }

      // Get user roles and permissions
      let roles: string[] = [];
      let permissions: string[] = [];

      if (user.funcRoleId) {
        const funcRole = await this.fncRoleService.findById(user.funcRoleId);
        if (funcRole) {
          roles.push(funcRole.code);
          permissions = funcRole.permissions || [];
        }
      }

      return {
        userId: user.id || user._id?.toString() || '',
        username: user.username,
        email: user.email,
        roles,
        permissions,
        tokenType: payload.tokenType || 'access',
      };
    } catch (error) {
      throw new UnauthorizedException('Invalid token');
    }
  }
}
