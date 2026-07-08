import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { InventoryBranchModule } from '../inventory-branch/inventory-branch.module';
import { CommonModule } from '../common/common.module';
import { NotificationsModule } from '../notifications/notification.module';
import { VouchersModule } from '../vouchers/vouchers.module';
import { AppSettingEntity } from '../app-settings/entities/app-setting.entity';
import { OrderEntity } from './entities/order.entity';
import { OrderItemEntity } from './entities/order-item.entity';
import { PaymentEntity } from './entities/payment.entity';
import { OrdersController } from './orders.controller';
import { OrdersPublicController } from './orders-public.controller';
import { OrdersCustomerController } from './orders-customer.controller';
import { OrdersService } from './orders.service';
import { OrdersExpiryService } from './orders-expiry.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      OrderEntity,
      OrderItemEntity,
      PaymentEntity,
      AppSettingEntity,
    ]),
    InventoryBranchModule,
    CommonModule,
    NotificationsModule,
    VouchersModule,
  ],
  controllers: [
    OrdersController,
    OrdersPublicController,
    OrdersCustomerController,
  ],
  providers: [OrdersService, OrdersExpiryService],
  exports: [OrdersService],
})
export class OrdersModule {}
