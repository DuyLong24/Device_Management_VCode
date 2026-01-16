import { IsNotEmpty, IsMongoId } from 'class-validator';

export class DeleteUserDto {
  @IsNotEmpty()
  @IsMongoId()
  id!: string;
}
