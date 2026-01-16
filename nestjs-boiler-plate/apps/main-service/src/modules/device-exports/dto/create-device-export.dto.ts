import { IsNotEmpty, IsNumber, IsOptional, IsEnum } from 'class-validator';

export class CreateDeviceExportDto {
  @IsNotEmpty()
  exportName!: string;

  @IsNotEmpty()
  type!: string;

  @IsNotEmpty()
  receiver!: string;

  @IsNotEmpty()
  status!: string;

  @IsNumber()
  totalItems!: number;

  @IsNumber()
  totalQuantity!: number;
}
