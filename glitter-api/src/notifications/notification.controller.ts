import {
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Patch,
  Query,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiQuery,
  ApiTags,
} from '@nestjs/swagger';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { NotificationsService } from './notification.service';
import { NotificationListResponse } from './types/notification-response.type';

@ApiTags('Notifications')
@ApiBearerAuth()
@Controller('notifications')
export class NotificationsController {
  constructor(private readonly service: NotificationsService) {}

  @Get()
  @ApiOperation({ summary: "List the current user's notifications" })
  @ApiQuery({ name: 'limit', required: false, example: 30 })
  @ApiQuery({
    name: 'before',
    required: false,
    description: 'ISO date — load notifications older than this (paging)',
  })
  @ApiQuery({ name: 'unread', required: false, example: 'true' })
  list(
    @CurrentUser('id') userId: string,
    @Query('limit') limit?: string,
    @Query('before') before?: string,
    @Query('unread') unread?: string,
  ): Promise<NotificationListResponse> {
    const beforeDate = before ? new Date(before) : undefined;
    return this.service.list(userId, {
      limit: limit ? Number.parseInt(limit, 10) || undefined : undefined,
      before:
        beforeDate && !Number.isNaN(beforeDate.getTime())
          ? beforeDate
          : undefined,
      unreadOnly: unread === 'true' || unread === '1',
    });
  }

  @Patch(':id/read')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Mark one notification as read' })
  async markRead(
    @Param('id') id: string,
    @CurrentUser('id') userId: string,
  ): Promise<{ ok: true }> {
    await this.service.markRead(id, userId);
    return { ok: true };
  }

  @Patch('read-all')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Mark all notifications as read' })
  async markAllRead(@CurrentUser('id') userId: string): Promise<{ ok: true }> {
    await this.service.markAllRead(userId);
    return { ok: true };
  }
}
