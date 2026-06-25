import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ReviewsController } from './reviews.controller';
import { ReviewsCustomerController } from './reviews-customer.controller';
import { ReviewsService } from './reviews.service';
import { ReviewEntity } from './entities/review.entity';
import { ProductEntity } from '../products/entities/product.entity';
import { OrderItemEntity } from '../orders/entities/order-item.entity';
import { UserEntity } from '../users/entities/user.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      ReviewEntity,
      ProductEntity,
      OrderItemEntity,
      UserEntity,
    ]),
  ],
  controllers: [ReviewsController, ReviewsCustomerController],
  providers: [ReviewsService],
})
export class ReviewsModule {}
