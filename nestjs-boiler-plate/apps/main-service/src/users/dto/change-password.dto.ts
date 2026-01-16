import { IsNotEmpty, MinLength, IsOptional, IsMongoId } from 'class-validator';

export class ChangePasswordDto {
  @IsOptional()
  @IsMongoId()
  userId?: string;

  @IsNotEmpty()
  @MinLength(6, { message: 'Current password must be at least 6 characters long' })
  currentPassword!: string;

  @IsNotEmpty()
  @MinLength(6, { message: 'New password must be at least 6 characters long' })
  newPassword!: string;
}
