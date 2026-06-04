import { Module } from '@nestjs/common';
import { ProductImagesController } from './product-image.controller';
import { ProductImagesService } from './product-image.service';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ProductEntity } from 'src/products/entities/product.entity';
import { ProductImageEntity } from './entities/product-image.entity';
import { CommonModule } from '../common/common.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([ProductImageEntity, ProductEntity]),
    CommonModule,
  ],
  controllers: [ProductImagesController],
  providers: [ProductImagesService],
  exports: [ProductImagesService],
})
export class ProductImagesModule {}
