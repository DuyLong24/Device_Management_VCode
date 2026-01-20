import { IsNotEmpty, IsOptional, IsString, IsObject, IsDateString, IsMongoId } from 'class-validator';

export class CreateDeviceDto {
  @IsNotEmpty()
  serial!: string;

  mac: string;

  p2p: string;

  @IsNotEmpty()
  name!: string;

  @IsNotEmpty()
  deviceModel!: string;

  @IsNotEmpty()
  unit!: string;

  @IsMongoId()
  categoryId!: string;

  @IsMongoId()
  warehouseId!: string;

  @IsMongoId()
  importId!: string;

  @IsMongoId()
  currentExportId!: string;

  @IsOptional()
  removeReason?: string;

  @IsOptional()
  removeDate?: Date;

  @IsOptional()
  @IsDateString()
  warrantyExpiredDate?: Date;

  @IsOptional()
  @IsDateString()
  warrantyActivatedDate?: Date;

  @IsOptional()
  @IsString()
  warrantyNote?: string;
}
