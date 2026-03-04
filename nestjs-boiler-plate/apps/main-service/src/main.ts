// Trigger Restart
import { NestFactory } from '@nestjs/core';
import { MicroserviceOptions, Transport } from '@nestjs/microservices';
import { AppModule } from './app.module';
import { KAFKA_CLIENT_CONFIG } from '@app/shared';
import { ValidationPipe } from '@nestjs/common';
import { json, urlencoded } from 'express';

async function bootstrap() {
  // Tạo HTTP application (API Gateway)
  const app = await NestFactory.create(AppModule);

  // Thiết lập prefix global cho tất cả routes
  // app.setGlobalPrefix('api');

  // Cấu hình CORS
  const corsOrigin = process.env.CORS_ORIGIN;
  console.log('CORS Origin Configured:', corsOrigin);

  app.enableCors({
    origin: corsOrigin === '*' ? true : (corsOrigin ? corsOrigin.split(',') : true),
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'Accept', 'Origin'],
  });

  // // Kết nối Kafka microservice để giao tiếp với upload service
  // app.connectMicroservice<MicroserviceOptions>({
  //   transport: Transport.KAFKA,
  //   options: {
  //     client: {
  //       ...KAFKA_CLIENT_CONFIG,
  //       clientId: 'main-service',
  //     },
  //     consumer: {
  //       groupId: 'main-service-consumer',
  //     },
  //   },
  // });

  // // Khởi động tất cả microservices
  // await app.startAllMicroservices();

  // Enable Global Validation Pipe
  app.useGlobalPipes(new ValidationPipe({
    transform: true,
    whitelist: true,
    forbidNonWhitelisted: true,
  }));

  // Nâng giới hạn body lên 20MB để hỗ trợ phiếu nhập lớn 
  app.use(json({ limit: '20mb' }));
  app.use(urlencoded({ extended: true, limit: '20mb' }));

  // Khởi động HTTP server
  const port = process.env.PORT || 3000;
  await app.listen(port);
  console.log(`Main Service is running on: http://localhost:${port}`);
  console.log('Kafka microservice is connected and listening...');
}

bootstrap();
