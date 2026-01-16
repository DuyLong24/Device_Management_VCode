import { PartialType } from '@nestjs/mapped-types';
import { CreateDeviceHistoryDto } from './create-device-history.dto';

export class UpdateDeviceHistoryDto extends PartialType(CreateDeviceHistoryDto) {}
