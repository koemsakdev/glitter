import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Brackets, LessThan, Repository } from 'typeorm';
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

const STAFF_ROLES = ['cashier', 'manager', 'admin'];

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
    const row = await this.repo.save(
      this.repo.create({ userId, type, data, link }),
    );
    this.realtime.publish('notifications');
    this.realtime.sendTo([userId], { ...this.toResponse(row), isRead: false });
  }

  /**
   * Fan out a notification to active staff — one row each, so read state is
   * per person. With a `branchId` (an order / stock alert for one branch) it
   * goes to admins and that branch's staff only; staff locked to another
   * branch never see it. Without one it goes to every staff member.
   */
  async notifyStaff(
    type: NotificationType,
    data: Record<string, unknown>,
    link: string | null = null,
    branchId: string | null = null,
  ): Promise<void> {
    const qb = this.userRepo
      .createQueryBuilder('u')
      .select(['u.id'])
      .where('u.role IN (:...roles)', { roles: STAFF_ROLES })
      .andWhere("u.accountStatus = 'active'");
    if (branchId) {
      qb.andWhere(
        new Brackets((w) =>
          w
            .where("u.role = 'admin'")
            .orWhere('u.branchId IS NULL')
            .orWhere('u.branchId = :branchId', { branchId }),
        ),
      );
    }
    const staff = await qb.getMany();
    if (staff.length === 0) return;
    const rows = await this.repo.save(
      staff.map((s) => this.repo.create({ userId: s.id, type, data, link })),
    );
    this.realtime.publish('notifications');
    // Each staff member gets their own row (own id / read state).
    for (const row of rows) {
      this.realtime.sendTo([row.userId], {
        ...this.toResponse(row),
        isRead: false,
      });
    }
  }

  /**
   * The user's notifications, newest first. Page back through older ones
   * with `before` (the `createdAt` of the last item already loaded);
   * `unreadOnly` limits the list to unread ones.
   */
  async list(
    userId: string,
    opts: { limit?: number; before?: Date; unreadOnly?: boolean } = {},
  ): Promise<NotificationListResponse> {
    const limit = Math.min(Math.max(opts.limit ?? 30, 1), 100);
    const where = {
      userId,
      ...(opts.unreadOnly ? { isRead: false } : {}),
      ...(opts.before ? { createdAt: LessThan(opts.before) } : {}),
    };
    const [rows, unread] = await Promise.all([
      // One extra row tells us whether there is another page.
      this.repo.find({ where, order: { createdAt: 'DESC' }, take: limit + 1 }),
      this.repo.count({ where: { userId, isRead: false } }),
    ]);
    return {
      data: rows.slice(0, limit).map((n) => this.toResponse(n)),
      unread,
      hasMore: rows.length > limit,
    };
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
