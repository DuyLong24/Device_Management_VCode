import { IsNotEmpty, IsNumber, IsOptional, IsEnum, IsString, IsArray } from 'class-validator';

export class CreateDeviceExportDto {
  @IsOptional()
  code?: string;

  @IsOptional()
  @IsString()
  exportName?: string;

  @IsNotEmpty()
  type!: string;

  @IsOptional()
  @IsString()
  receiver?: string;

  @IsOptional()
  @IsString()
  receiverPerson?: string;

  @IsOptional()
  @IsString()
  project?: string;

  @IsOptional()
  @IsString()
  customer?: string;

  @IsOptional()
  @IsString()
  deliveryAddress?: string;

  @IsEnum(['SALE', 'WARRANTY', 'TRANSFER', 'OTHER'])
  @IsOptional()
  exportReason?: string;

  @IsOptional()
  @IsString()
  notes?: string;

  @IsOptional()
  @IsArray()
  requirements?: {
    productCode: string;
    productName: string;
    quantity: number;
  }[];

  @IsOptional()
  @IsEnum(['DRAFT', 'PENDING_APPROVAL'])
  status?: string;

  // items is now usually empty on creation, but kept for compatibility
  @IsOptional()
  @IsArray()
  items?: any[];

  @IsOptional()
  totalItems?: number;

  @IsOptional()
  totalQuantity?: number;
}
