import { Module } from '@nestjs/common';
import { MailerModule } from '@nestjs-modules/mailer';
import { HandlebarsAdapter } from '@nestjs-modules/mailer/dist/adapters/handlebars.adapter';
import { ConfigService } from '@nestjs/config';
import { MailService } from './services/mail.service';
import { join } from 'path';

@Module({
    imports: [
        MailerModule.forRootAsync({
            useFactory: async (config: ConfigService) => ({
                transport: {
                    host: config.get('MAIL_HOST'),
                    port: config.get('MAIL_PORT'),
                    secure: false,
                    auth: {
                        user: config.get('MAIL_USER'),
                        pass: config.get('MAIL_PASS'),
                    },
                },
                defaults: {
                    from: `"${config.get('MAIL_FROM_NAME') || 'Device Management'}" <${config.get('MAIL_USER')}>`,
                },
                template: {
                    dir: join(process.cwd(), 'dist/apps/main-service/common/mail/templates'),
                    adapter: new HandlebarsAdapter(
                        {
                            inc: (v) => parseInt(v) + 1,
                        },
                    ),
                    options: {
                        strict: true,
                    },
                },
                options: {
                    strict: true,
                },
                // Thêm runtime options cho Handlebars
                compilerOptions: {
                    strict: true,
                    knownHelpersOnly: false,
                },
                runtimeOptions: {
                    allowProtoPropertiesByDefault: true,
                    allowProtoMethodsByDefault: true,
                },
            }),
            inject: [ConfigService],
        }),
    ],
    providers: [MailService],
    exports: [MailService],
})
export class MailModule { }
