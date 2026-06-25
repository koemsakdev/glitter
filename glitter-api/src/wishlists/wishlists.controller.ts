import {
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Roles } from '../auth/decorators/roles.decorator';
import { RolesGuard } from '../auth/guards/roles.guard';
import { WishlistsService } from './wishlists.service';
import type { ProductResponse } from '../products/types/product-response.type';
import type { WishlistProductStat } from './types/wishlist-response.type';

/** Admin wishlist insights. */
@ApiTags('Wishlists (admin)')
@ApiBearerAuth()
@UseGuards(RolesGuard)
@Roles('manager', 'admin', 'super_admin')
@Controller('wishlists')
export class WishlistsController {
  constructor(private readonly service: WishlistsService) {}

  @Get('most-wishlisted')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Products customers want most' })
  async mostWishlisted(
    @Query('limit') limit = '5',
  ): Promise<{ data: WishlistProductStat[] }> {
    return {
      data: await this.service.mostWishlisted(parseInt(limit, 10) || 5),
    };
  }

  @Get('counts')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Wishlist count per product { productId: count }' })
  async counts(): Promise<{ data: Record<string, number> }> {
    return { data: await this.service.countsByProduct() };
  }

  @Get('product/:productId/count')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'How many customers wishlisted a product' })
  async productCount(
    @Param('productId') productId: string,
  ): Promise<{ count: number }> {
    return { count: await this.service.productCount(productId) };
  }

  @Get('customer/:userId')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: "A customer's wishlist products" })
  async customerWishlist(
    @Param('userId') userId: string,
  ): Promise<{ data: ProductResponse[] }> {
    return { data: await this.service.getItems(userId) };
  }
}
