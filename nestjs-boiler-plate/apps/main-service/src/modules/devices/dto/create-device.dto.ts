import { IsNotEmpty, IsMongoId, IsOptional, IsEnum } from 'class-validator';

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
}
