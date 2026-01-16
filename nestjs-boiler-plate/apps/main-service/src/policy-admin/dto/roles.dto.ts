import { IsString, IsArray, IsOptional } from 'class-validator';

export class CreateRoleDto {
  @IsString()
  name!: string;

  @IsString()
  code!: string;

  @IsArray()
  @IsString({ each: true })
  permissions!: string[];
}

export class UpdateRoleDto {
  @IsOptional()
  @IsString()
  name?: string;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  permissions?: string[];
}

export class BulkSetPermissionsDto {
  @IsArray()
  @IsString({ each: true })
  permissions!: string[];
}
