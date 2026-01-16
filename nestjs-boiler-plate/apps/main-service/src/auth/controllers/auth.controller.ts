import {
  Controller,
  Post,
  Body,
  HttpCode,
  HttpStatus,
  UseGuards,
  Request,
  Get,
} from '@nestjs/common';
import { AuthService } from '../services/auth.service';
import { LoginDto, RegisterDto, RefreshTokenDto, ChangePasswordDto } from '../dto/auth.dto';


@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('login')
  @HttpCode(HttpStatus.OK)
  async login(@Body() loginDto: LoginDto) {
    return this.authService.login(loginDto);
  }

  @Post('register')
  @HttpCode(HttpStatus.CREATED)
  async register(@Body() registerDto: RegisterDto) {
    return this.authService.register(registerDto);
  }

  @Post('refresh')
  @HttpCode(HttpStatus.OK)
  async refresh(@Body() refreshTokenDto: RefreshTokenDto) {
    return this.authService.refreshToken(refreshTokenDto);
  }

  @Post('logout')
  @HttpCode(HttpStatus.OK)
  async logout(@Request() req: any) {
    const token = req.headers.authorization?.split(' ')[1];
    await this.authService.logout(token);
    return { message: 'Logged out successfully' };
  }

  @Post('change-password')
  @HttpCode(HttpStatus.OK)
  async changePassword(@Request() req: any, @Body() changePasswordDto: ChangePasswordDto) {
    const user = req.userContext;
    return this.authService.changePassword(user.userId, changePasswordDto);
  }

  @Get('profile')
  async getProfile(@Request() req: any) {
    const user = req.userContext;
    return { message: 'User profile retrieved', userId: user.userId, role: user.role };
  }
}
