import { Injectable, Logger } from '@nestjs/common';
import { writeFileSync, unlinkSync, existsSync, mkdirSync } from 'fs';
import { join } from 'path';
import { v4 as uuidv4 } from 'uuid';
import {
  FileUploadRequest,
  FileUploadResponse,
  FileDeleteRequest,
  FileDeleteResponse,
  FileInfo,
} from '@app/shared';

@Injectable()
export class UploadService {
  private readonly logger = new Logger(UploadService.name);
  private readonly uploadDir = './uploads';
  private readonly baseUrl = 'http://localhost:3002'; // URL của Upload Service
  
  // In-memory storage cho demo (trong thực tế nên dùng database)
  private readonly fileStorage = new Map<string, FileInfo>();

  constructor() {
    // Tạo thư mục uploads nếu chưa tồn tại
    this.ensureUploadDirExists();
  }

  /**
   * Xử lý upload file từ buffer
   */
  async uploadFile(request: FileUploadRequest): Promise<FileUploadResponse> {
    try {
      // Tạo unique file ID
      const fileId = uuidv4();
      
      // Tạo tên file với timestamp để tránh trùng
      const timestamp = Date.now();
      const fileExtension = this.getFileExtension(request.fileName);
      const fileName = `${timestamp}-${fileId}${fileExtension}`;
      
      // Đường dẫn file
      const filePath = join(this.uploadDir, fileName);
      
      // Convert buffer từ object về Buffer (xử lý serialization từ microservices)
      const buffer = Buffer.isBuffer(request.buffer) 
        ? request.buffer 
        : Buffer.from(request.buffer);
      
      // Lưu file từ buffer
      writeFileSync(filePath, buffer);
      
      // Tạo URL public
      const fileUrl = `${this.baseUrl}/files/${fileName}`;
      
      // Tạo file info
      const fileInfo: FileInfo = {
        id: fileId,
        fileName: fileName,
        originalName: request.fileName,
        filePath: filePath,
        fileUrl: fileUrl,
        fileSize: request.fileSize,
        mimeType: request.mimeType,
        uploadedAt: new Date(),
        uploadedBy: request.userId,
        metadata: request.metadata,
      };
      
      // Lưu vào storage (trong thực tế sẽ lưu vào database)
      this.fileStorage.set(fileId, fileInfo);
      
      this.logger.log(`File uploaded successfully: ${fileName}`);
      
      return {
        success: true,
        fileId: fileId,
        fileName: fileName,
        filePath: filePath,
        fileUrl: fileUrl,
        fileSize: request.fileSize,
        uploadedAt: new Date(),
      };
      
    } catch (error) {
      this.logger.error('File upload failed:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  /**
   * Xử lý xóa file
   */
  async deleteFile(request: FileDeleteRequest): Promise<FileDeleteResponse> {
    try {
      // Tìm file info
      const fileInfo = this.fileStorage.get(request.fileId);
      
      if (!fileInfo) {
        return {
          success: false,
          error: 'File not found',
        };
      }
      
      // Kiểm tra quyền (nếu có userId)
      if (request.userId && fileInfo.uploadedBy !== request.userId) {
        return {
          success: false,
          error: 'Permission denied',
        };
      }
      
      // Xóa file vật lý
      if (existsSync(fileInfo.filePath)) {
        unlinkSync(fileInfo.filePath);
      }
      
      // Xóa khỏi storage
      this.fileStorage.delete(request.fileId);
      
      this.logger.log(`File deleted successfully: ${fileInfo.fileName}`);
      
      return {
        success: true,
        fileId: request.fileId,
      };
      
    } catch (error) {
      this.logger.error('File deletion failed:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  /**
   * Tạo thư mục uploads nếu chưa tồn tại
   */
  private ensureUploadDirExists(): void {
    if (!existsSync(this.uploadDir)) {
      mkdirSync(this.uploadDir, { recursive: true });
      this.logger.log(`Created upload directory: ${this.uploadDir}`);
    }
  }

  /**
   * Lấy extension của file
   */
  private getFileExtension(fileName: string): string {
    const lastDotIndex = fileName.lastIndexOf('.');
    return lastDotIndex !== -1 ? fileName.substring(lastDotIndex) : '';
  }

  /**
   * Lấy thông tin tất cả files (cho debug)
   */
  getAllFiles(): FileInfo[] {
    return Array.from(this.fileStorage.values());
  }

  /**
   * Lấy thông tin file theo ID
   */
  getFileById(fileId: string): FileInfo | undefined {
    return this.fileStorage.get(fileId);
  }
}
