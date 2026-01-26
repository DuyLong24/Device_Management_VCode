// Trigger Reload
import { IsString, IsNotEmpty, IsDateString, IsOptional, IsArray, ValidateNested, IsNumber, IsEnum } from 'class-validator';
import { Type } from 'class-transformer';

class ImportDeviceDto {
  @IsString()
  @IsNotEmpty()
  deviceCode: string;

  @IsNumber()
  @IsNotEmpty()
  quantity: number;

  @IsArray()
  @IsOptional()
  @IsString({ each: true })
  expectedSerials?: string[];

  @IsNumber()
  @IsOptional()
  boxCount?: number;

  @IsNumber()
  @IsOptional()
  itemsPerBox?: number;

  @IsOptional()
  key?: string;

  @IsArray()
  @IsOptional()
  @ValidateNested({ each: true })
  @Type(() => ImportDetailDto)
  expectedDetails?: ImportDetailDto[];
}

class ImportDetailDto {
  @IsString()
  @IsOptional()
  serial?: string;

  @IsString()
  @IsOptional()
  p2p?: string;

  @IsString()
  @IsNotEmpty()
  mac: string;

  @IsString()
  @IsOptional()
  name?: string;

}

export class CreateDeviceImportDto {
  @IsOptional() // FE => disabled
  code?: string;

  @IsString()
  @IsNotEmpty()
  deviceType: string;

  @IsString()
  @IsNotEmpty()
  origin: string;

  @IsDateString()
  @IsNotEmpty()
  importDate: Date;

  @IsString()
  @IsNotEmpty()
  importedBy: string;

  @IsString()
  @IsOptional()
  supplier: string;

  @IsString()
  @IsOptional()
  handoverPerson?: string;

  @IsString()
  @IsOptional()
  notes?: string;

  @IsOptional()
  @IsOptional()
  @IsEnum(['DRAFT', 'PUBLIC', 'COMPLETED', 'CANCELLED'])
  status?: string;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ImportDeviceDto)
  devices: ImportDeviceDto[];

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ImportDetailDto)
  details?: ImportDetailDto[];
}