import {
  Body,
  Controller,
  HttpCode,
  HttpStatus,
  Post,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiBody,
  ApiOperation,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { Roles } from '../auth/decorators/roles.decorator';
import { RolesGuard } from '../auth/guards/roles.guard';
import { AiService } from './ai.service';
import {
  GenerateBrandInfoDto,
  GenerateCategoryInfoDto,
} from './dto/generate-brand-info.dto';

import { GenerateProductInfoDto } from './dto/generate-product-info.dto';

interface GenerateInfoResponse {
  data: {
    value: string;
    field: string;
  };
}

@ApiTags('AI')
@ApiBearerAuth()
@Controller('ai')
@UseGuards(RolesGuard)
@Roles('admin', 'super_admin')
export class AiController {
  constructor(private readonly aiService: AiService) {}

  /**
   * Generate brand info (website URL or description)
   * POST /ai/brand
   */
  @Post('brand')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Generate brand info with AI' })
  @ApiResponse({ status: 200 })
  async generateBrandInfo(
    @Body() dto: GenerateBrandInfoDto,
  ): Promise<GenerateInfoResponse> {
    const value = await this.aiService.generateBrandField(
      dto.name,
      dto.field,
      dto.language ?? 'en',
    );
    return { data: { value, field: dto.field } };
  }

  /**
   * Generate category info (description)
   * POST /ai/category
   */
  @Post('category')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Generate category info with AI' })
  @ApiResponse({ status: 200 })
  async generateCategoryInfo(
    @Body() dto: GenerateCategoryInfoDto,
  ): Promise<GenerateInfoResponse> {
    const value = await this.aiService.generateCategoryField(
      dto.name,
      dto.field,
      dto.language ?? 'en',
    );
    return { data: { value, field: dto.field } };
  }

  @Post('product')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Generate product description or details using AI',
    description:
      'Generates a product description or details with optional brand/category context for relevance.',
  })
  @ApiBody({ type: GenerateProductInfoDto })
  @ApiResponse({
    status: 200,
    description: 'Generated text',
    schema: { example: { value: 'A refined leather shoulder bag...' } },
  })
  @UseGuards(RolesGuard)
  @Roles('admin', 'super_admin', 'manager')
  async generateProductInfo(
    @Body() dto: GenerateProductInfoDto,
  ): Promise<{ value: string }> {
    const value = await this.aiService.generateProductField(
      dto.name,
      dto.field,
      dto.language,
      { brandName: dto.brandName, categoryName: dto.categoryName },
    );
    return { value };
  }
}
