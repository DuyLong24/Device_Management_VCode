export interface FileUploadRequest {
  fileName: string;
  fileSize: number;
  mimeType: string;
  buffer: Buffer;
  userId?: string;
  metadata?: Record<string, any>;
}

export interface FileUploadResponse {
  success: boolean;
  fileId?: string;
  fileName?: string;
  filePath?: string;
  fileUrl?: string;
  fileSize?: number;
  uploadedAt?: Date;
  error?: string;
}

export interface FileDeleteRequest {
  fileId: string;
  userId?: string;
}

export interface FileDeleteResponse {
  success: boolean;
  fileId?: string;
  error?: string;
}

export interface FileInfo {
  id: string;
  fileName: string;
  originalName: string;
  filePath: string;
  fileUrl: string;
  fileSize: number;
  mimeType: string;
  uploadedAt: Date;
  uploadedBy?: string;
  metadata?: Record<string, any>;
}
