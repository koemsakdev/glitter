import { Module } from '@nestjs/common';
import { ProductBadgesController } from './product-badge.controller';
import { ProductBadgesService } from './product-badge.service';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ProductEntity } from 'src/products/entities/product.entity';
import { ProductBadgeEntity } from './entities/product-badge.entity';
import { BadgeEntity } from '../badges/entities/badge.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([ProductBadgeEntity, ProductEntity, BadgeEntity]),
  ],
  controllers: [ProductBadgesController],
  providers: [ProductBadgesService],
  exports: [ProductBadgesService],
})
export class ProductBadgesModule {}
