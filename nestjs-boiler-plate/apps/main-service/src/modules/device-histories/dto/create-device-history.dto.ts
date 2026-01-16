import { IsMongoId, IsNotEmpty, IsOptional, IsEnum } from 'class-validator';

export class CreateDeviceHistoryDto {
  @IsMongoId()
  deviceId!: string;

  @IsNotEmpty()
  action!: string;

  @IsMongoId()
  fromWarehouseId!: string;

  @IsMongoId()
  toWarehouseId!: string;

  @IsMongoId()
  actorId!: string;

  @IsNotEmpty()
  note!: string;
}
