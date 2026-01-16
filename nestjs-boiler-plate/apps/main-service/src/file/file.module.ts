import { Module } from '@nestjs/common';
import { ClientsModule, Transport } from '@nestjs/microservices';
import { FileController } from './file.controller';
import { FileService } from './file.service';
import { SERVICES, KAFKA_CLIENT_CONFIG } from '@app/shared';

@Module({
  imports: [
    ClientsModule.register([
      {
        name: SERVICES.UPLOAD_SERVICE,
        transport: Transport.KAFKA,
        options: {
          client: {
            ...KAFKA_CLIENT_CONFIG,
            clientId: 'main-service-file-client',
          },
          consumer: {
            groupId: 'main-service-file-consumer',
          },
        },
      },
    ]),
  ],
  controllers: [FileController],
  providers: [FileService],
  exports: [FileService],
})
export class FileModule {}
