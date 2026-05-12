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
  ApiOperation,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { Roles } from '../auth/decorators/roles.decorator';
import { RolesGuard } from '../auth/guards/roles.guard';
import { AiService } from './ai.service';
import { GenerateBrandInfoDto } from './dto/generate-brand-info.dto';

interface GenerateBrandInfoResponse {
  data: {
    value: string;
    field: 'websiteUrl' | 'description';
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
   * Generate a brand field using AI.
   * POST /ai/brand
   */
  @Post('brand')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Generate brand info with AI',
    description:
      'Generate website URL or description for a brand based on its name',
  })
  @ApiResponse({
    status: 200,
    description: 'Generated value',
    schema: {
      type: 'object',
      properties: {
        data: {
          type: 'object',
          properties: {
            value: { type: 'string', example: 'https://www.gucci.com' },
            field: { type: 'string', example: 'websiteUrl' },
          },
        },
      },
    },
  })
  @ApiResponse({ status: 400, description: 'Invalid input' })
  @ApiResponse({ status: 502, description: 'AI service error' })
  async generateBrandInfo(
    @Body() dto: GenerateBrandInfoDto,
  ): Promise<GenerateBrandInfoResponse> {
    const value = await this.aiService.generateBrandField(
      dto.name,
      dto.field,
      dto.language ?? 'en',
    );
    return {
      data: {
        value,
        field: dto.field,
      },
    };
  }
}
