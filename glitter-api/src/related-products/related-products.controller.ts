import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Put,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Public } from '../auth/decorators/public.decorator';
import { Roles } from '../auth/decorators/roles.decorator';
import { RolesGuard } from '../auth/guards/roles.guard';
import { SetRelatedProductsDto } from './dto/set-related-products.dto';
import { RelatedProductsService } from './related-products.service';
import type { ProductResponse } from '../products/types/product-response.type';

@ApiTags('Related products')
@ApiBearerAuth()
@Controller('related-products')
export class RelatedProductsController {
  constructor(private readonly service: RelatedProductsService) {}

  @Get('product/:productId/active')
  @HttpCode(HttpStatus.OK)
  @Public()
  @ApiOperation({ summary: 'Active related products (storefront)' })
  async getActive(
    @Param('productId') productId: string,
  ): Promise<{ data: ProductResponse[] }> {
    return { data: await this.service.getActiveForProduct(productId) };
  }

  @Get('product/:productId')
  @HttpCode(HttpStatus.OK)
  @UseGuards(RolesGuard)
  @Roles('manager', 'admin', 'super_admin')
  @ApiOperation({ summary: 'All related products for the editor' })
  async getForProduct(
    @Param('productId') productId: string,
  ): Promise<{ data: ProductResponse[] }> {
    return { data: await this.service.getForProduct(productId) };
  }

  @Put('product/:productId')
  @HttpCode(HttpStatus.OK)
  @UseGuards(RolesGuard)
  @Roles('manager', 'admin', 'super_admin')
  @ApiOperation({ summary: 'Replace the related set for a product' })
  async setForProduct(
    @Param('productId') productId: string,
    @Body() dto: SetRelatedProductsDto,
  ): Promise<{ data: ProductResponse[] }> {
    return {
      data: await this.service.setForProduct(productId, dto.relatedProductIds),
    };
  }
}
