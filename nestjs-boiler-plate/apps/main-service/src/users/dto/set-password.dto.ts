import { IsNotEmpty, MinLength, IsOptional, IsMongoId } from 'class-validator';

export class SetPasswordDto {
  @IsOptional()
  @IsMongoId()
  userId?: string;

  @IsNotEmpty()
  @MinLength(6, { message: 'Password must be at least 6 characters long' })
  newPassword!: string;
}
