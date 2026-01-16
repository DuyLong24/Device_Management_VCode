import { PartialType } from '@nestjs/mapped-types';
import { CreateFncRoleDto } from './create-fnc-role.dto';

export class UpdateFncRoleDto extends PartialType(CreateFncRoleDto) {}
