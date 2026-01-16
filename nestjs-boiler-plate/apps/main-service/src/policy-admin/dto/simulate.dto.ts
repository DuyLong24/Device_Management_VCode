import { IsString, IsArray, IsOptional, IsEnum, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';

export class HttpRequestDto {
  @IsString()
  @IsEnum(['GET', 'POST', 'PUT', 'PATCH', 'DELETE'])
  method!: string;

  @IsString()
  path!: string;
}

export class SubjectDto {
  @IsString()
  user_id!: string;

  @IsArray()
  @IsString({ each: true })
  roles!: string[];

  @IsArray()
  @IsString({ each: true })
  perms!: string[];

  @IsOptional()
  @IsString()
  tenant_id?: string;
}

export class SimulateDto {
  @ValidateNested()
  @Type(() => HttpRequestDto)
  http!: HttpRequestDto;

  @ValidateNested()
  @Type(() => SubjectDto)
  subject!: SubjectDto;
}
