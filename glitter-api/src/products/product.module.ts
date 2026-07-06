import { Module } from '@nestjs/common';
import { ProductsController } from './product.controller';
import { ProductsService } from './product.service';
import { TypeOrmModule } from '@nestjs/typeorm';
import { BrandEntity } from 'src/brands/entities/brand.entity';
import { CategoryEntity } from 'src/category/entities/category.entity';
import { ProductEntity } from './entities/product.entity';
import { ProductVariantEntity } from 'src/product-variants/entities/product-variant.entity';
import { BadgeEntity } from 'src/badges/entities/badge.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      ProductEntity,
      CategoryEntity,
      BrandEntity,
      ProductVariantEntity,
      BadgeEntity,
    ]),
  ],
  controllers: [ProductsController],
  providers: [ProductsService],
  exports: [ProductsService],
})
export class ProductsModule {}
