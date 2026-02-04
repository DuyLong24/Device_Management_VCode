import { Module, Global } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { MongooseModule } from '@nestjs/mongoose';
import { ScheduleModule } from '@nestjs/schedule';
import { MailModule } from '../../common/mail/mail.module';
import { NotificationService } from './services/notification.service';
import { NotificationCleanupService } from './services/notification-cleanup.service';
import { NotificationController } from './controllers/notification.controller';
import { NotificationGateway } from './gateways/notification.gateway';
import { Notification, NotificationSchema } from './schemas/notification.schema';

@Global()
@Module({
    imports: [
        ConfigModule,
        MailModule,
        ScheduleModule.forRoot(),
        MongooseModule.forFeature([{ name: Notification.name, schema: NotificationSchema }]),
    ],
    providers: [NotificationService, NotificationCleanupService, NotificationGateway],
    controllers: [NotificationController],
    exports: [NotificationService],
})
export class NotificationsModule { }
