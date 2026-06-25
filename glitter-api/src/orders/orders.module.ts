import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { InventoryBranchModule } from '../inventory-branch/inventory-branch.module';
import { OrderEntity } from './entities/order.entity';
import { OrderItemEntity } from './entities/order-item.entity';
import { PaymentEntity } from './entities/payment.entity';
import { OrdersController } from './orders.controller';
import { OrdersPublicController } from './orders-public.controller';
import { OrdersCustomerController } from './orders-customer.controller';
import { OrdersService } from './orders.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([OrderEntity, OrderItemEntity, PaymentEntity]),
    InventoryBranchModule,
  ],
  controllers: [
    OrdersController,
    OrdersPublicController,
    OrdersCustomerController,
  ],
  providers: [OrdersService],
  exports: [OrdersService],
})
export class OrdersModule {}
