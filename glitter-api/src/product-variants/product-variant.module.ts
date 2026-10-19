import { Module } from '@nestjs/common';
import { ProductVariantsController } from './product-variant.controller';
import { ProductVariantsService } from './product-variant.service';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ProductEntity } from '../products/entities/product.entity';
import { ProductVariantEntity } from './entities/product-variant.entity';

@Module({
  imports: [TypeOrmModule.forFeature([ProductVariantEntity, ProductEntity])],
  controllers: [ProductVariantsController],
  providers: [ProductVariantsService],
  exports: [ProductVariantsService],
})
export class ProductVariantsModule {}
