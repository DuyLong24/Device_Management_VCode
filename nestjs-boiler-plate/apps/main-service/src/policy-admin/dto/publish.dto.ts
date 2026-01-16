import { IsString, IsOptional } from 'class-validator';

export class PublishDto {
  @IsOptional()
  @IsString()
  createdBy?: string;
}
