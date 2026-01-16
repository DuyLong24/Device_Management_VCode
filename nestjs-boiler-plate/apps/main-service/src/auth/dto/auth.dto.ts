import { IsEmail, IsString, MinLength, IsOptional } from 'class-validator';

export class LoginDto {
  @IsString()
  username!: string;

  @IsString()
  @MinLength(6)
  password!: string;
}

export class RegisterDto {
  @IsString()
  username!: string;

  @IsEmail()
  email!: string;

  @IsString()
  @MinLength(6)
  password!: string;

  @IsString()
  name!: string;

  @IsOptional()
  @IsString()
  funcRoleId?: string;

  @IsOptional()
  @IsString()
  phoneNumber?: string;
}

export class RefreshTokenDto {
  @IsString()
  refreshToken!: string;
}

export class ChangePasswordDto {
  @IsString()
  currentPassword!: string;

  @IsString()
  @MinLength(6)
  newPassword!: string;
}
