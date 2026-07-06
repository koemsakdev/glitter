import {
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Patch,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
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
  list(
    @CurrentUser('id') userId: string,
  ): Promise<NotificationListResponse> {
    return this.service.list(userId);
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
  async markAllRead(
    @CurrentUser('id') userId: string,
  ): Promise<{ ok: true }> {
    await this.service.markAllRead(userId);
    return { ok: true };
  }
}
