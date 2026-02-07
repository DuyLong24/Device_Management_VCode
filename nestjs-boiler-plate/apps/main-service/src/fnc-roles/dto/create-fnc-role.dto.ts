import { IsNotEmpty, IsArray, IsOptional, IsString } from 'class-validator';

export class CreateFncRoleDto {
  @IsNotEmpty()
  name!: string;

  @IsNotEmpty()
  code!: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsArray()
  permissions!: string[];
}

