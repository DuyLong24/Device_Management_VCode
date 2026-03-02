import { PartialType } from '@nestjs/mapped-types';
import { CreateDefectReasonDto } from './create-defect-reason.dto';

export class UpdateDefectReasonDto extends PartialType(CreateDefectReasonDto) { }
