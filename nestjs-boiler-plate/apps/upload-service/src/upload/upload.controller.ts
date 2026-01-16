import { Controller, Logger } from '@nestjs/common';
import { MessagePattern, Payload } from '@nestjs/microservices';
import { UploadService } from './upload.service';
import {
  KAFKA_TOPICS,
  FileUploadRequest,
  FileUploadResponse,
  FileDeleteRequest,
  FileDeleteResponse,
} from '@app/shared';

@Controller()
export class UploadController {
  private readonly logger = new Logger(UploadController.name);

  constructor(private readonly uploadService: UploadService) {}

  /**
   * Xử lý upload file message từ Kafka
   */
  @MessagePattern(KAFKA_TOPICS.FILE_UPLOAD)
  async handleFileUpload(
    @Payload() data: FileUploadRequest,
  ): Promise<FileUploadResponse> {
    this.logger.log(`Received upload request for file: ${data.fileName}`);
    
    try {
      // Gọi service để xử lý upload
      const result = await this.uploadService.uploadFile(data);
      
      this.logger.log(`Upload completed for file: ${data.fileName}`);
      return result;
    } catch (error) {
      this.logger.error(`Upload failed for file: ${data.fileName}`, error);
      
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Upload failed',
      };
    }
  }

  /**
   * Xử lý delete file message từ Kafka
   */
  @MessagePattern(KAFKA_TOPICS.FILE_DELETE)
  async handleFileDelete(
    @Payload() data: FileDeleteRequest,
  ): Promise<FileDeleteResponse> {
    this.logger.log(`Received delete request for file: ${data.fileId}`);
    
    try {
      const result = await this.uploadService.deleteFile(data);
      
      this.logger.log(`Delete completed for file: ${data.fileId}`);
      return result;
    } catch (error) {
      this.logger.error(`Delete failed for file: ${data.fileId}`, error);
      
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Delete failed',
      };
    }
  }
}
