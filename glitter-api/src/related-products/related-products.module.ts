import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { RelatedProductsController } from './related-products.controller';
import { RelatedProductsService } from './related-products.service';
import { RelatedProductEntity } from './entities/related-product.entity';
import { ProductsModule } from '../products/product.module';

@Module({
  imports: [TypeOrmModule.forFeature([RelatedProductEntity]), ProductsModule],
  controllers: [RelatedProductsController],
  providers: [RelatedProductsService],
})
export class RelatedProductsModule {}
