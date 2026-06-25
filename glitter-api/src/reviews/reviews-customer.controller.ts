import { Body, Controller, HttpCode, HttpStatus, Post } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { CreateCustomerReviewDto } from './dto/create-customer-review.dto';
import { ReviewsService } from './reviews.service';
import { ReviewDetailResponse } from './types/review-response.type';

/** Review submission for a logged-in customer (linked + verified). */
@ApiTags('Reviews (customer)')
@ApiBearerAuth()
@Controller('account/reviews')
export class ReviewsCustomerController {
  constructor(private readonly reviewsService: ReviewsService) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({
    summary:
      'Submit a review as a logged-in customer (auto verified if bought)',
  })
  async create(
    @CurrentUser('id') userId: string,
    @Body() dto: CreateCustomerReviewDto,
  ): Promise<ReviewDetailResponse> {
    return this.reviewsService.createAsCustomer(userId, dto);
  }
}
