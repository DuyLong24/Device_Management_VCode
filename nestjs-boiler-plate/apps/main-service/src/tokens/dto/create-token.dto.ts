import { IsNotEmpty, IsMongoId, IsDateString, IsBoolean, IsOptional, IsEnum } from 'class-validator';

export class CreateTokenDto {
  @IsNotEmpty()
  token!: string;

  @IsMongoId()
  userId!: string;

  @IsNotEmpty()
  type!: string;

  @IsOptional()
  expires?: Date;

  @IsBoolean()
  blacklisted!: boolean;
}
