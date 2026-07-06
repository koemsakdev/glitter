import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository } from 'typeorm';
import { UserEntity } from '../users/entities/user.entity';
import { RealtimeService } from '../realtime/realtime.service';
import {
  NotificationEntity,
  NotificationType,
} from './entities/notification.entity';
import {
  NotificationListResponse,
  NotificationResponse,
} from './types/notification-response.type';

const STAFF_ROLES = ['cashier', 'manager', 'admin', 'super_admin'];

@Injectable()
export class NotificationsService {
  constructor(
    @InjectRepository(NotificationEntity)
    private readonly repo: Repository<NotificationEntity>,
    @InjectRepository(UserEntity)
    private readonly userRepo: Repository<UserEntity>,
    private readonly realtime: RealtimeService,
  ) {}

  /** Create a notification for one user (a customer, or a specific staff member). */
  async notifyUser(
    userId: string,
    type: NotificationType,
    data: Record<string, unknown>,
    link: string | null = null,
  ): Promise<void> {
    await this.repo.save(this.repo.create({ userId, type, data, link }));
    this.realtime.publish('notifications');
  }

  /** Fan out a notification to every active staff member. */
  async notifyStaff(
    type: NotificationType,
    data: Record<string, unknown>,
    link: string | null = null,
  ): Promise<void> {
    const staff = await this.userRepo.find({
      where: { role: In(STAFF_ROLES), accountStatus: 'active' },
      select: ['id'],
    });
    if (staff.length === 0) return;
    await this.repo.save(
      staff.map((s) => this.repo.create({ userId: s.id, type, data, link })),
    );
    this.realtime.publish('notifications');
  }

  async list(userId: string, limit = 30): Promise<NotificationListResponse> {
    const [rows, unread] = await Promise.all([
      this.repo.find({
        where: { userId },
        order: { createdAt: 'DESC' },
        take: limit,
      }),
      this.repo.count({ where: { userId, isRead: false } }),
    ]);
    return { data: rows.map((n) => this.toResponse(n)), unread };
  }

  async unreadCount(userId: string): Promise<number> {
    return this.repo.count({ where: { userId, isRead: false } });
  }

  async markRead(id: string, userId: string): Promise<void> {
    await this.repo.update({ id, userId }, { isRead: true });
    this.realtime.publish('notifications');
  }

  async markAllRead(userId: string): Promise<void> {
    await this.repo.update({ userId, isRead: false }, { isRead: true });
    this.realtime.publish('notifications');
  }

  private toResponse(n: NotificationEntity): NotificationResponse {
    return {
      id: n.id,
      type: n.type,
      data: n.data ?? {},
      link: n.link,
      isRead: n.isRead,
      createdAt: n.createdAt,
    };
  }
}
