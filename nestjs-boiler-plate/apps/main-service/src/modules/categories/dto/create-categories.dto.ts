import { IsNotEmpty, IsOptional, IsEnum } from 'class-validator';

export class CreateCategoryDto {
  @IsNotEmpty()
  name!: string;

  @IsNotEmpty()
  description!: string;
}
