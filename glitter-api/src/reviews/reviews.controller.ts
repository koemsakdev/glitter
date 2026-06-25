import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Public } from '../auth/decorators/public.decorator';
import { Roles } from '../auth/decorators/roles.decorator';
import { RolesGuard } from '../auth/guards/roles.guard';
import { CreateReviewDto } from './dto/create-review.dto';
import { UpdateReviewStatusDto } from './dto/update-review-status.dto';
import type { ReviewStatus } from './entities/review.entity';
import {
  ProductReviewsResponse,
  ReviewDetailResponse,
  ReviewListResponse,
} from './types/review-response.type';
import { ReviewsService } from './reviews.service';

@ApiTags('Reviews')
@ApiBearerAuth()
@Controller('reviews')
export class ReviewsController {
  constructor(private readonly reviewsService: ReviewsService) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @Public()
  @ApiOperation({
    summary: 'Submit a product review (guest, pending approval)',
  })
  async create(@Body() dto: CreateReviewDto): Promise<ReviewDetailResponse> {
    return this.reviewsService.create(dto);
  }

  @Get()
  @HttpCode(HttpStatus.OK)
  @UseGuards(RolesGuard)
  @Roles('admin', 'super_admin', 'manager')
  @ApiOperation({ summary: 'List reviews for moderation' })
  async findAll(
    @Query('status') status?: ReviewStatus,
    @Query('productId') productId?: string,
    @Query('page') page = '1',
    @Query('limit') limit = '20',
  ): Promise<ReviewListResponse> {
    return this.reviewsService.findAll(
      status,
      productId,
      parseInt(page, 10) || 1,
      parseInt(limit, 10) || 20,
    );
  }

  @Get('product/:productId')
  @HttpCode(HttpStatus.OK)
  @Public()
  @ApiOperation({ summary: 'Approved reviews for a product (+ summary)' })
  async findByProduct(
    @Param('productId') productId: string,
  ): Promise<ProductReviewsResponse> {
    return this.reviewsService.findByProduct(productId);
  }

  @Patch(':id/status')
  @HttpCode(HttpStatus.OK)
  @UseGuards(RolesGuard)
  @Roles('admin', 'super_admin', 'manager')
  @ApiOperation({ summary: 'Approve / hide a review' })
  async updateStatus(
    @Param('id') id: string,
    @Body() dto: UpdateReviewStatusDto,
  ): Promise<ReviewDetailResponse> {
    return this.reviewsService.updateStatus(id, dto.status);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @UseGuards(RolesGuard)
  @Roles('admin', 'super_admin')
  @ApiOperation({ summary: 'Delete a review' })
  async delete(@Param('id') id: string): Promise<void> {
    return this.reviewsService.delete(id);
  }
}
