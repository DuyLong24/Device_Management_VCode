import { NestFactory } from '@nestjs/core';
import { MicroserviceOptions, Transport } from '@nestjs/microservices';
import { AppModule } from './app.module';
import { KAFKA_CLIENT_CONFIG } from '@app/shared';

async function bootstrap() {
  // Tạo Kafka microservice cho Upload Service
  const app = await NestFactory.createMicroservice<MicroserviceOptions>(
    AppModule,
    {
      transport: Transport.KAFKA,
      options: {
        client: {
          ...KAFKA_CLIENT_CONFIG,
          clientId: 'upload-service',
        },
        consumer: {
          groupId: 'upload-service-consumer',
        },
      },
    },
  );

  // Khởi động microservice
  await app.listen();
  console.log('Upload Service (Kafka Microservice) is running...');
  console.log('Listening for Kafka messages...');
}

bootstrap();
