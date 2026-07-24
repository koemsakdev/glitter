import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { OrdersModule } from '../orders/orders.module';
import { PaymentConfigEntity } from './entities/payment-config.entity';
import { PaymentConfigService } from './payment-config.service';
import { AbaPaywayService } from './aba-payway.service';
import { AbaReconciliationService } from './aba-reconciliation.service';
import { PaymentConfigController } from './payment-config.controller';
import { PaymentsAbaController } from './payments-aba.controller';

@Module({
  imports: [TypeOrmModule.forFeature([PaymentConfigEntity]), OrdersModule],
  controllers: [PaymentConfigController, PaymentsAbaController],
  providers: [PaymentConfigService, AbaPaywayService, AbaReconciliationService],
  exports: [PaymentConfigService, AbaPaywayService],
})
export class PaymentsAbaModule {}
