import { Module } from '@nestjs/common';
import { MulterModule } from '@nestjs/platform-express';
import { diskStorage } from 'multer';
import { extname, join } from 'path';
import { UploadController } from './upload.controller';
import { UploadService } from './upload.service';

@Module({
  imports: [
    MulterModule.register({
      storage: diskStorage({
        destination: './uploads', // Thư mục lưu file
        filename: (req, file, callback) => {
          // Tạo tên file unique với timestamp
          const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
          const ext = extname(file.originalname);
          const filename = `${file.fieldname}-${uniqueSuffix}${ext}`;
          callback(null, filename);
        },
      }),
      limits: {
        fileSize: 10 * 1024 * 1024, // 10MB limit
      },
    }),
  ],
  controllers: [UploadController],
  providers: [UploadService],
})
export class UploadModule {}
