import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { UserEntity } from '../users/entities/user.entity';
import { NotificationEntity } from './entities/notification.entity';
import { NotificationsController } from './notification.controller';
import { NotificationsService } from './notification.service';

@Module({
  imports: [TypeOrmModule.forFeature([NotificationEntity, UserEntity])],
  controllers: [NotificationsController],
  providers: [NotificationsService],
  exports: [NotificationsService],
})
export class NotificationsModule {}
