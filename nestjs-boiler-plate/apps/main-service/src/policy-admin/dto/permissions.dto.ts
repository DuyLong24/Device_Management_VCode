import { IsString, IsArray, IsEnum, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';

export class ResourceMappingDto {
  @IsString()
  path!: string;

  @IsArray()
  @IsEnum(['GET', 'POST', 'PUT', 'PATCH', 'DELETE'], { each: true })
  methods!: string[];
}

export class PermissionConfigDto {
  @IsString()
  key!: string;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ResourceMappingDto)
  resources!: ResourceMappingDto[];
}

export class BulkUpsertPermissionsDto {
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => PermissionConfigDto)
  permissions!: PermissionConfigDto[];
}
