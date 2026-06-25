import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Post,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { AddWishlistItemDto } from './dto/add-wishlist-item.dto';
import { WishlistsService } from './wishlists.service';
import type { ProductResponse } from '../products/types/product-response.type';

/** Logged-in customer's own wishlist (user comes from the token). */
@ApiTags('Wishlist (customer)')
@ApiBearerAuth()
@Controller('account/wishlist')
export class WishlistCustomerController {
  constructor(private readonly service: WishlistsService) {}

  @Get()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: "Products in the current customer's wishlist" })
  async myWishlist(
    @CurrentUser('id') userId: string,
  ): Promise<{ data: ProductResponse[] }> {
    return { data: await this.service.getItems(userId) };
  }

  @Post()
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Add a product to the wishlist' })
  async add(
    @CurrentUser('id') userId: string,
    @Body() dto: AddWishlistItemDto,
  ): Promise<void> {
    return this.service.addItem(userId, dto);
  }

  @Delete(':productId')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Remove a product from the wishlist' })
  async remove(
    @CurrentUser('id') userId: string,
    @Param('productId') productId: string,
  ): Promise<void> {
    return this.service.removeItem(userId, productId);
  }
}
