import { IsNotEmpty, IsArray, IsOptional, IsEnum } from 'class-validator';

export class CreateFncRoleDto {
  @IsNotEmpty()
  name!: string;

  @IsNotEmpty()
  code!: string;

  @IsArray()
  permissions!: string[];
}
