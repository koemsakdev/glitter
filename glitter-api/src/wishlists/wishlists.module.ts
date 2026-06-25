import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { WishlistsController } from './wishlists.controller';
import { WishlistCustomerController } from './wishlist-customer.controller';
import { WishlistsService } from './wishlists.service';
import { WishlistEntity } from './entities/wishlist.entity';
import { WishlistItemEntity } from './entities/wishlist-item.entity';
import { ProductsModule } from '../products/product.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([WishlistEntity, WishlistItemEntity]),
    ProductsModule,
  ],
  controllers: [WishlistsController, WishlistCustomerController],
  providers: [WishlistsService],
})
export class WishlistsModule {}
