import { PartialType } from '@nestjs/mapped-types';
import { CreateDeviceExportDto } from './create-device-export.dto';

export class UpdateDeviceExportDto extends PartialType(CreateDeviceExportDto) {}
