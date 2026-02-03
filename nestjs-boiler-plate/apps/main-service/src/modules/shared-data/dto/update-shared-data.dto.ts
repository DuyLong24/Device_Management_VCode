
import { PartialType } from '@nestjs/mapped-types';
import { CreateSharedDataDto, CreateSharedDataGroupDto } from './create-shared-data.dto';

export class UpdateSharedDataGroupDto extends PartialType(CreateSharedDataGroupDto) { }

export class UpdateSharedDataDto extends PartialType(CreateSharedDataDto) { }
