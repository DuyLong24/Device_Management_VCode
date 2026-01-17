import { NestFactory } from '@nestjs/core';
import { MicroserviceOptions, Transport } from '@nestjs/microservices';
import { AppModule } from './app.module';
import { KAFKA_CLIENT_CONFIG } from '@app/shared';

async function bootstrap() {
  // Tạo HTTP application (API Gateway)
  const app = await NestFactory.create(AppModule);

  // Thiết lập prefix global cho tất cả routes
  app.setGlobalPrefix('api');

  // Cấu hình CORS
  app.enableCors({
    origin: true,
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
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

  // Khởi động HTTP server
  await app.listen(3000);
  console.log('Main Service is running on: http://localhost:3000');
  console.log('Kafka microservice is connected and listening...');
}

bootstrap();
