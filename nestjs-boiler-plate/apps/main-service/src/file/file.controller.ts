import { 
  Controller, 
  Post, 
  Delete, 
  UseInterceptors, 
  UploadedFile, 
  Body, 
  Param,
  HttpException,
  HttpStatus 
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { FileService } from './file.service';
import { FileUploadResponse, FileDeleteResponse } from '@app/shared';

@Controller('files')
export class FileController {
  constructor(private readonly fileService: FileService) {}

  /**
   * Upload file endpoint - Nhận file từ client và gửi đến Upload Service qua Kafka
   */
  @Post('upload')
  @UseInterceptors(FileInterceptor('file'))
  async uploadFile(
    @UploadedFile() file: Express.Multer.File,
    @Body('userId') userId?: string,
    @Body('metadata') metadata?: string,
  ): Promise<FileUploadResponse> {
    try {
      // Validate file
      if (!file) {
        throw new HttpException('No file provided', HttpStatus.BAD_REQUEST);
      }

      // Validate file size (ví dụ: max 10MB)
      const maxSize = 10 * 1024 * 1024; // 10MB
      if (file.size > maxSize) {
        throw new HttpException('File too large', HttpStatus.PAYLOAD_TOO_LARGE);
      }

      // Parse metadata nếu có
      let parsedMetadata: Record<string, any> | undefined;
      if (metadata) {
        try {
          parsedMetadata = JSON.parse(metadata);
        } catch (error) {
          throw new HttpException('Invalid metadata format', HttpStatus.BAD_REQUEST);
        }
      }

      // Gửi request đến Upload Service qua Kafka
      const result = await this.fileService.uploadFile({
        fileName: file.originalname,
        fileSize: file.size,
        mimeType: file.mimetype,
        buffer: file.buffer,
        userId,
        metadata: parsedMetadata,
      });

      return result;
    } catch (error) {
      if (error instanceof HttpException) {
        throw error;
      }
      throw new HttpException(
        'File upload failed',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  /**
   * Delete file endpoint - Xóa file qua Upload Service
   */
  @Delete(':fileId')
  async deleteFile(
    @Param('fileId') fileId: string,
    @Body('userId') userId?: string,
  ): Promise<FileDeleteResponse> {
    try {
      if (!fileId) {
        throw new HttpException('File ID is required', HttpStatus.BAD_REQUEST);
      }

      const result = await this.fileService.deleteFile({
        fileId,
        userId,
      });

      return result;
    } catch (error) {
      if (error instanceof HttpException) {
        throw error;
      }
      throw new HttpException(
        'File deletion failed',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }
}
