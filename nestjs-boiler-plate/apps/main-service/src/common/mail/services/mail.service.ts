import { Injectable, Logger } from '@nestjs/common';
import { MailerService } from '@nestjs-modules/mailer';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class MailService {
    private readonly logger = new Logger(MailService.name);

    constructor(
        private readonly mailerService: MailerService,
        private readonly configService: ConfigService,
    ) { }

    async sendMail(to: string, subject: string, template: string, context: any) {
        try {
            if (!to) {
                this.logger.warn('Receiver email is empty. Skipping email sending.');
                return;
            }

            await this.mailerService.sendMail({
                to,
                subject,
                template: `./${template}`,
                context, // data được inject vào template
            });

            this.logger.log(`Email sent to ${to} with subject "${subject}"`);
            return true;
        } catch (error) {
            this.logger.error(`Failed to send email to ${to}`, error.stack);
            return false;
        }
    }
}
