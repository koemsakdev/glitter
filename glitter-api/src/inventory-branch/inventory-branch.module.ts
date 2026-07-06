import { Module } from '@nestjs/common';
import { InventoryBranchController } from './inventory-branch.controller';
import { InventoryBranchService } from './inventory-branch.service';
import { TypeOrmModule } from '@nestjs/typeorm';
import { BranchEntity } from 'src/branch/entities/branch.entity';
import { ProductVariantEntity } from 'src/product-variants/entities/product-variant.entity';
import { ProductEntity } from 'src/products/entities/product.entity';
import { NotificationsModule } from '../notifications/notification.module';
import { InventoryBranchEntity } from './entities/inventory-branch.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      InventoryBranchEntity,
      ProductVariantEntity,
      BranchEntity,
      ProductEntity,
    ]),
    NotificationsModule,
  ],
  controllers: [InventoryBranchController],
  providers: [InventoryBranchService],
  exports: [InventoryBranchService],
})
export class InventoryBranchModule {}
