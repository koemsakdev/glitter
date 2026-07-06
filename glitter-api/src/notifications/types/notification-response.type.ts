import { NotificationType } from '../entities/notification.entity';

export interface NotificationResponse {
  id: string;
  type: NotificationType;
  data: Record<string, unknown>;
  link: string | null;
  isRead: boolean;
  createdAt: Date;
}

export interface NotificationListResponse {
  data: NotificationResponse[];
  unread: number;
}
