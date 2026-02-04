import { Controller, Get, Put, Delete, Param, Query, ParseIntPipe, HttpCode, HttpStatus, BadRequestException } from '@nestjs/common';
import { NotificationService } from '../services/notification.service';
import { UserId } from '../decorators/user-id.decorator';

@Controller('notifications')
export class NotificationController {
    constructor(private readonly notificationService: NotificationService) { }

    @Get()
    async getUserNotifications(
        @UserId() userId: string,
        @Query('page', new ParseIntPipe({ optional: true })) page: number = 1,
        @Query('limit', new ParseIntPipe({ optional: true })) limit: number = 20,
    ) {
        if (!userId) {
            throw new BadRequestException('User ID not found in request');
        }
        return this.notificationService.getUserNotifications(userId, { page, limit });
    }

    @Put(':id/read')
    async markAsRead(@Param('id') id: string, @UserId() userId: string) {
        return this.notificationService.markAsRead(id, userId);
    }

    @Put('read-all')
    async markAllRead(@UserId() userId: string) {
        if (!userId) {
            throw new BadRequestException('User ID not found in request');
        }
        return this.notificationService.markAllRead(userId);
    }

    @Delete(':id')
    @HttpCode(HttpStatus.NO_CONTENT)
    async deleteNotification(@Param('id') id: string, @UserId() userId: string) {
        if (!userId) {
            throw new BadRequestException('User ID not found in request');
        }
        await this.notificationService.deleteNotification(id, userId);
    }
}
