import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, type FindOptionsWhere } from 'typeorm';
import { CreateReviewDto } from './dto/create-review.dto';
import { CreateCustomerReviewDto } from './dto/create-customer-review.dto';
import { ReviewEntity, type ReviewStatus } from './entities/review.entity';
import { ProductEntity } from '../products/entities/product.entity';
import { OrderItemEntity } from '../orders/entities/order-item.entity';
import { UserEntity } from '../users/entities/user.entity';
import { RealtimeService } from '../realtime/realtime.service';
import {
  ProductReviewsResponse,
  ReviewDetailResponse,
  ReviewListResponse,
  ReviewResponse,
} from './types/review-response.type';

@Injectable()
export class ReviewsService {
  constructor(
    @InjectRepository(ReviewEntity)
    private readonly reviewRepo: Repository<ReviewEntity>,
    @InjectRepository(ProductEntity)
    private readonly productRepo: Repository<ProductEntity>,
    @InjectRepository(OrderItemEntity)
    private readonly orderItemRepo: Repository<OrderItemEntity>,
    @InjectRepository(UserEntity)
    private readonly userRepo: Repository<UserEntity>,
    private readonly realtime: RealtimeService,
  ) {}

  async create(dto: CreateReviewDto): Promise<ReviewDetailResponse> {
    const product = await this.productRepo.findOne({
      where: { id: dto.productId },
    });
    if (product === null) {
      throw new NotFoundException(`Product ${dto.productId} not found`);
    }
    const entity = this.reviewRepo.create({
      productId: dto.productId,
      userId: null,
      reviewerName: dto.reviewerName,
      rating: dto.rating,
      titleEn: dto.titleEn ?? null,
      titleKm: dto.titleKm ?? null,
      commentEn: dto.commentEn ?? null,
      commentKm: dto.commentKm ?? null,
      status: 'pending',
    });
    const saved = await this.reviewRepo.save(entity);
    this.realtime.publish('reviews');
    return { data: this.toResponse(saved) };
  }

  /** A logged-in customer's review: linked to their account + verified if bought. */
  async createAsCustomer(
    userId: string,
    dto: CreateCustomerReviewDto,
  ): Promise<ReviewDetailResponse> {
    const product = await this.productRepo.findOne({
      where: { id: dto.productId },
    });
    if (product === null) {
      throw new NotFoundException(`Product ${dto.productId} not found`);
    }
    const user = await this.userRepo.findOne({ where: { id: userId } });
    const verifiedPurchase = await this.hasPurchased(userId, dto.productId);

    const entity = this.reviewRepo.create({
      productId: dto.productId,
      userId,
      reviewerName: user?.fullName ?? 'Customer',
      rating: dto.rating,
      titleEn: dto.titleEn ?? null,
      titleKm: dto.titleKm ?? null,
      commentEn: dto.commentEn ?? null,
      commentKm: dto.commentKm ?? null,
      verifiedPurchase,
      status: 'pending',
    });
    const saved = await this.reviewRepo.save(entity);
    this.realtime.publish('reviews');
    return { data: this.toResponse(saved) };
  }

  /** Did this customer ever order this product? */
  private async hasPurchased(
    userId: string,
    productId: string,
  ): Promise<boolean> {
    const count = await this.orderItemRepo
      .createQueryBuilder('oi')
      .innerJoin('oi.order', 'o')
      .where('oi.product_id = :productId', { productId })
      .andWhere('o.customer_id = :userId', { userId })
      .getCount();
    return count > 0;
  }

  async findAll(
    status?: ReviewStatus,
    productId?: string,
    page = 1,
    limit = 20,
  ): Promise<ReviewListResponse> {
    const where: FindOptionsWhere<ReviewEntity> = {};
    if (status) where.status = status;
    if (productId) where.productId = productId;

    const [reviews, total] = await this.reviewRepo.findAndCount({
      where,
      relations: ['product'],
      order: { createdAt: 'DESC' },
      skip: (page - 1) * limit,
      take: limit,
    });
    return {
      data: reviews.map((r) => this.toResponse(r)),
      total,
    };
  }

  async findByProduct(productId: string): Promise<ProductReviewsResponse> {
    const reviews = await this.reviewRepo.find({
      where: { productId, status: 'approved' },
      order: { createdAt: 'DESC' },
    });
    const count = reviews.length;
    const average =
      count === 0
        ? 0
        : Math.round(
            (reviews.reduce((sum, r) => sum + r.rating, 0) / count) * 10,
          ) / 10;
    return {
      data: reviews.map((r) => this.toResponse(r)),
      summary: { average, count },
    };
  }

  async updateStatus(
    id: string,
    status: ReviewStatus,
  ): Promise<ReviewDetailResponse> {
    const review = await this.reviewRepo.findOne({
      where: { id },
      relations: ['product'],
    });
    if (review === null) {
      throw new NotFoundException(`Review ${id} not found`);
    }
    review.status = status;
    const saved = await this.reviewRepo.save(review);
    await this.recompute(review.productId);
    this.realtime.publish('reviews');
    this.realtime.publish('products');
    return { data: this.toResponse(saved) };
  }

  async delete(id: string): Promise<void> {
    const review = await this.reviewRepo.findOne({ where: { id } });
    if (review === null) {
      throw new NotFoundException(`Review ${id} not found`);
    }
    const productId = review.productId;
    await this.reviewRepo.remove(review);
    await this.recompute(productId);
    this.realtime.publish('reviews');
    this.realtime.publish('products');
  }

  /** Recompute product.averageRating + reviewCount from approved reviews. */
  private async recompute(productId: string): Promise<void> {
    const row = await this.reviewRepo
      .createQueryBuilder('r')
      .select('COALESCE(AVG(r.rating), 0)', 'avg')
      .addSelect('COUNT(*)', 'cnt')
      .where('r.product_id = :productId AND r.status = :status', {
        productId,
        status: 'approved',
      })
      .getRawOne<{ avg: string; cnt: string }>();
    await this.productRepo.update(
      { id: productId },
      {
        averageRating: Math.round(Number(row?.avg ?? 0) * 10) / 10,
        reviewCount: Number(row?.cnt ?? 0),
      },
    );
  }

  private toResponse(entity: ReviewEntity): ReviewResponse {
    return {
      id: entity.id,
      productId: entity.productId,
      productNameEn: entity.product?.nameEn ?? null,
      reviewerName: entity.reviewerName,
      rating: entity.rating,
      titleEn: entity.titleEn,
      titleKm: entity.titleKm,
      commentEn: entity.commentEn,
      commentKm: entity.commentKm,
      verifiedPurchase: entity.verifiedPurchase,
      helpfulCount: entity.helpfulCount,
      status: entity.status,
      createdAt: entity.createdAt,
    };
  }
}
