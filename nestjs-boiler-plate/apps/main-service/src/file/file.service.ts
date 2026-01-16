import { Injectable, Inject, Logger } from '@nestjs/common';
import { ClientKafka } from '@nestjs/microservices';
import { firstValueFrom, timeout } from 'rxjs';
import {
  SERVICES,
  KAFKA_TOPICS,
  FileUploadRequest,
  FileUploadResponse,
  FileDeleteRequest,
  FileDeleteResponse,
} from '@app/shared';

@Injectable()
export class FileService {
  private readonly logger = new Logger(FileService.name);

  constructor(
    @Inject(SERVICES.UPLOAD_SERVICE)
    private readonly uploadServiceClient: ClientKafka,
  ) {}

  /**
   * Gửi file upload request đến Upload Service qua Kafka
   */
  async uploadFile(request: FileUploadRequest): Promise<FileUploadResponse> {
    try {
      this.logger.log(`Sending upload request for file: ${request.fileName}`);
      
      // Gửi message đến Kafka topic và chờ response
      const response$ = this.uploadServiceClient.send<FileUploadResponse>(
        KAFKA_TOPICS.FILE_UPLOAD,
        request,
      );

      // Chờ response với timeout 30 seconds
      const result = await firstValueFrom(
        response$.pipe(timeout(30000))
      );

      this.logger.log(`Upload response received for file: ${request.fileName}`);
      return result;
    } catch (error) {
      this.logger.error(`Upload failed for file: ${request.fileName}`, error);
      return {
        success: false,
        error: error.message || 'Upload service unavailable',
      };
    }
  }

  /**
   * Gửi file delete request đến Upload Service qua Kafka
   */
  async deleteFile(request: FileDeleteRequest): Promise<FileDeleteResponse> {
    try {
      this.logger.log(`Sending delete request for file: ${request.fileId}`);
      
      const response$ = this.uploadServiceClient.send<FileDeleteResponse>(
        KAFKA_TOPICS.FILE_DELETE,
        request,
      );

      const result = await firstValueFrom(
        response$.pipe(timeout(10000))
      );

      this.logger.log(`Delete response received for file: ${request.fileId}`);
      return result;
    } catch (error) {
      this.logger.error(`Delete failed for file: ${request.fileId}`, error);
      return {
        success: false,
        error: error.message || 'Upload service unavailable',
      };
    }
  }

  /**
   * Kết nối đến Kafka khi module khởi tạo
   */
  async onModuleInit() {
    this.uploadServiceClient.subscribeToResponseOf(KAFKA_TOPICS.FILE_UPLOAD);
    this.uploadServiceClient.subscribeToResponseOf(KAFKA_TOPICS.FILE_DELETE);
    await this.uploadServiceClient.connect();
    this.logger.log('Connected to Upload Service via Kafka');
  }

  /**
   * Ngắt kết nối Kafka khi module bị destroy
   */
  async onModuleDestroy() {
    await this.uploadServiceClient.close();
    this.logger.log('Disconnected from Upload Service');
  }
}
