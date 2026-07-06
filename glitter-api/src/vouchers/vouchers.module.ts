import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { VouchersController } from './vouchers.controller';
import { VouchersCustomerController } from './vouchers-customer.controller';
import { VouchersService } from './vouchers.service';
import { VoucherEntity } from './entities/voucher.entity';
import { OrderEntity } from '../orders/entities/order.entity';
import { UserEntity } from '../users/entities/user.entity';

@Module({
  imports: [TypeOrmModule.forFeature([VoucherEntity, OrderEntity, UserEntity])],
  controllers: [VouchersController, VouchersCustomerController],
  providers: [VouchersService],
  exports: [VouchersService],
})
export class VouchersModule {}
