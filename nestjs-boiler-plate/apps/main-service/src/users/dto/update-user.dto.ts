import { PartialType } from '@nestjs/mapped-types';
import { CreateUserDto } from './create-user.dto';

export class UpdateUserDto extends PartialType(CreateUserDto) {
  // PartialType tự động làm tất cả fields từ CreateUserDto thành optional
  // Không cần định nghĩa lại các fields
}
