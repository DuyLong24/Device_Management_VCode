import { IsEmail, IsNotEmpty, MinLength, IsOptional, IsEnum, IsDateString, IsBoolean } from 'class-validator';

export class CreateUserDto {
  @IsNotEmpty()
  username!: string;

  @IsEmail()
  email!: string;

  @IsNotEmpty()
  @MinLength(6)
  password!: string;

  @IsNotEmpty()
  name!: string;

  @IsOptional()
  @IsEnum(['male', 'female', 'other'])
  gender?: string;

  @IsOptional()
  code?: string;

  @IsOptional()
  funcRoleId?: string;

  @IsOptional()
  uiRoleId?: string;

  @IsOptional()
  @IsDateString()
  dateOfBirth?: string;

  @IsOptional()
  phoneNumber?: string;

  @IsOptional()
  address?: string;

  @IsOptional()
  @IsEnum(['active', 'inactive', 'pending'])
  status?: string;

  @IsOptional()
  @IsBoolean()
  isPasswordChange?: boolean;

  @IsOptional()
  @IsDateString()
  dayPasswordChange?: string;
}
