import { IsString, IsArray, IsOptional, IsEnum, ValidateNested, IsBoolean } from 'class-validator';
import { Type } from 'class-transformer';

export class ResourceTemplateDto {
  @IsString()
  module!: string;

  @IsString()
  path!: string;

  @IsArray()
  @IsEnum(['GET', 'POST', 'PUT', 'PATCH', 'DELETE'], { each: true })
  methods!: string[];

  @IsOptional()
  @IsString()
  description?: string;
}

export class BulkUpsertResourceTemplatesDto {
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ResourceTemplateDto)
  templates!: ResourceTemplateDto[];
}

export class ScanRoutesDto {
  @IsOptional()
  @IsBoolean()
  apply?: boolean;

  @IsOptional()
  @IsBoolean()
  applyPermissions?: boolean;
}

export class CatalogResponseDto {
  modules!: Array<{ code: string; name: string }>;
  actions!: string[];
  resourceTemplates!: ResourceTemplateDto[];
}
