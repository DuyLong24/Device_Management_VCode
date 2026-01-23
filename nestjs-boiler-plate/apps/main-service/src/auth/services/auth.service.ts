import {
  Injectable,
  UnauthorizedException,
  ConflictException,
  BadRequestException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcryptjs';
import { UserService } from '../../users/services/user.service';
import { TokenService } from '../../tokens/services/token.service';
import { FncRoleService } from '../../fnc-roles/services/fnc-role.service';
import { LoginDto, RegisterDto, RefreshTokenDto, ChangePasswordDto } from '../dto/auth.dto';
import { AuthPayload, TokenResponse } from '../interfaces/auth.interface';
import { CreateUserDto } from '../../users/dto/create-user.dto';

@Injectable()
export class AuthService {
  constructor(
    private readonly userService: UserService,
    private readonly tokenService: TokenService,
    private readonly fncRoleService: FncRoleService,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
  ) { }

  async login(loginDto: LoginDto): Promise<TokenResponse> {
    const { username, password } = loginDto;

    // Find user by username or email
    let user = await this.userService.getByEmail(username);
    if (!user) {
      // Try to find by username if email search fails
      // Note: You might need to add findByUsername method to UserService
      throw new UnauthorizedException('Invalid credentials');
    }

    // Verify password
    const isPasswordValid = await this.verifyPassword(password, user.password);
    if (!isPasswordValid) {
      throw new UnauthorizedException('Invalid credentials');
    }

    // Check if user is active
    if (user.status !== 'active') {
      throw new UnauthorizedException('Account is not active');
    }

    // Generate tokens
    const authPayload = await this.createAuthPayload(user);
    const tokens = await this.generateTokens(authPayload);

    // Save refresh token
    await this.tokenService.create({
      userId: authPayload.userId,
      token: tokens.refreshToken,
      type: 'refresh',
      expires: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days
      blacklisted: false,
    });

    return tokens;
  }

  async register(registerDto: RegisterDto): Promise<TokenResponse> {
    // Check if user already exists
    const existingUser = await this.userService.getByEmail(registerDto.email);
    if (existingUser) {
      throw new ConflictException('User with this email already exists');
    }

    // Hash password
    const hashedPassword = await this.hashPassword(registerDto.password);

    // Create user
    const createUserDto: CreateUserDto = {
      ...registerDto,
      password: hashedPassword,
      status: 'active',
    };

    const user = await this.userService.create(createUserDto);

    // Generate tokens
    const authPayload = await this.createAuthPayload(user);
    const tokens = await this.generateTokens(authPayload);

    // Save refresh token
    await this.tokenService.create({
      userId: authPayload.userId,
      token: tokens.refreshToken,
      type: 'refresh',
      expires: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days
      blacklisted: false,
    });

    return tokens;
  }

  async refreshToken(refreshTokenDto: RefreshTokenDto): Promise<TokenResponse> {
    const { refreshToken } = refreshTokenDto;

    // Verify refresh token
    try {
      const payload = this.jwtService.verify(refreshToken, {
        secret: this.configService.get<string>('JWT_REFRESH_SECRET') || this.configService.get<string>('JWT_SECRET'),
      });

      // Check if token exists in database
      const tokenRecord = await this.tokenService.findByToken(refreshToken);
      if (!tokenRecord || tokenRecord.type !== 'refresh') {
        throw new UnauthorizedException('Invalid refresh token');
      }

      // Check if token is expired
      if (tokenRecord.expires && new Date() > tokenRecord.expires) {
        await this.tokenService.delete(tokenRecord.id || tokenRecord._id?.toString() || '');
        throw new UnauthorizedException('Refresh token expired');
      }

      // Get user
      const user = await this.userService.findById(payload.sub);

      // Generate new tokens
      const authPayload = await this.createAuthPayload(user);
      const tokens = await this.generateTokens(authPayload);

      // Update refresh token in database
      await this.tokenService.update(tokenRecord.id || tokenRecord._id?.toString() || '', {
        token: tokens.refreshToken,
        expires: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days
      });

      return tokens;
    } catch (error) {
      throw new UnauthorizedException('Invalid refresh token');
    }
  }

  async logout(token: string): Promise<void> {
    try {
      const payload = this.jwtService.decode(token) as any;
      if (payload?.sub) {
        // Remove all tokens for this user
        await this.tokenService.deleteByUserId(payload.sub);
      }
    } catch (error) {
      // Token might be invalid, but we still want to "logout" successfully
    }
  }

  async changePassword(userId: string, changePasswordDto: ChangePasswordDto): Promise<void> {
    const user = await this.userService.findById(userId);

    // Verify current password
    const isCurrentPasswordValid = await this.verifyPassword(
      changePasswordDto.currentPassword,
      user.password
    );

    if (!isCurrentPasswordValid) {
      throw new BadRequestException('Current password is incorrect');
    }

    // Hash new password
    const hashedNewPassword = await this.hashPassword(changePasswordDto.newPassword);

    // Update password using existing UserService method
    await this.userService.changePassword({
      userId,
      currentPassword: changePasswordDto.currentPassword,
      newPassword: hashedNewPassword,
    });

    // Invalidate all tokens for this user
    await this.tokenService.deleteByUserId(userId);
  }

  private async createAuthPayload(user: any): Promise<AuthPayload> {
    let roles: string[] = [];
    let permissions: string[] = [];

    // Get user roles and permissions
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
    };
  }

  private async generateTokens(authPayload: AuthPayload): Promise<TokenResponse> {
    const accessTokenPayload = {
      sub: authPayload.userId,
      username: authPayload.username,
      email: authPayload.email,
      roles: authPayload.roles,
      permissions: authPayload.permissions,
      tokenType: 'access',
    };

    const refreshTokenPayload = {
      sub: authPayload.userId,
      tokenType: 'refresh',
    };

    const accessTokenExpiresIn = this.configService.get<string>('JWT_ACCESS_TOKEN_EXPIRES_IN') ||
      this.configService.get<string>('JWT_EXPIRATION') || '15m';
    const refreshTokenExpiresIn = this.configService.get<string>('JWT_REFRESH_TOKEN_EXPIRES_IN') ||
      this.configService.get<string>('JWT_REFRESH_EXPIRATION') || '7d';

    const accessToken = this.jwtService.sign(accessTokenPayload, {
      secret: this.configService.get<string>('JWT_SECRET'),
      expiresIn: accessTokenExpiresIn as any,
    });

    const refreshToken = this.jwtService.sign(refreshTokenPayload, {
      secret: this.configService.get<string>('JWT_REFRESH_SECRET') || this.configService.get<string>('JWT_SECRET'),
      expiresIn: refreshTokenExpiresIn as any,
    });

    return {
      accessToken,
      refreshToken,
      expiresIn: this.parseExpirationTime(accessTokenExpiresIn),
      tokenType: 'Bearer',
    };
  }

  private async hashPassword(password: string): Promise<string> {
    const saltRounds = 10;
    return bcrypt.hash(password, saltRounds);
  }

  private async verifyPassword(password: string, hash: string): Promise<boolean> {
    return bcrypt.compare(password, hash);
  }

  private parseExpirationTime(expiration: string): number {
    // Convert string like '15m', '1h', '7d' to seconds
    const unit = expiration.slice(-1);
    const value = parseInt(expiration.slice(0, -1));

    switch (unit) {
      case 's':
        return value;
      case 'm':
        return value * 60;
      case 'h':
        return value * 60 * 60;
      case 'd':
        return value * 24 * 60 * 60;
      default:
        return 900; // 15 minutes default
    }
  }
}
