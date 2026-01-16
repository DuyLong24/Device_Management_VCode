import { IsString, IsOptional, IsNumber, IsObject } from 'class-validator';

export class UploadFileDto {
  @IsString()
  fileName: string;

  @IsNumber()
  fileSize: number;

  @IsString()
  mimeType: string;

  @IsOptional()
  @IsString()
  userId?: string;

  @IsOptional()
  @IsObject()
  metadata?: Record<string, any>;
}

export class DeleteFileDto {
  @IsString()
  fileId: string;

  @IsOptional()
  @IsString()
  userId?: string;
}
