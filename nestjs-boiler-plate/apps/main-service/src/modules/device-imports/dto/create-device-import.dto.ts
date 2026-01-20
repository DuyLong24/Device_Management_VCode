import { IsString, IsNotEmpty, IsDateString, IsOptional, IsArray, ValidateNested, IsNumber, IsEnum } from 'class-validator';
import { Type } from 'class-transformer';

class ImportProductDto {
  @IsString()
  @IsNotEmpty()
  productCode: string;

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
}

class ImportDetailDto {
  @IsString()
  serial: string;

  @IsString()
  p2p: string;

  @IsString()
  mac: string;

}

export class CreateDeviceImportDto {
  @IsOptional() // FE => disabled
  code?: string;

  @IsString()
  @IsNotEmpty()
  productType: string;

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
  @IsEnum(['DRAFT', 'COMPLETED', 'CANCELLED'])
  status?: string;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ImportProductDto)
  products: ImportProductDto[];

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ImportDetailDto)
  details?: ImportDetailDto[];
}