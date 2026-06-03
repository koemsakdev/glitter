import { Controller, Get, HttpCode, HttpStatus } from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { UseGuards } from '@nestjs/common';
import { Roles } from '../auth/decorators/roles.decorator';
import { RolesGuard } from '../auth/guards/roles.guard';
import { DashboardService } from './dashboard.service';
import type { DashboardStatsResponse } from './types/dashboard.type';

@ApiTags('Dashboard')
@ApiBearerAuth()
@Controller('dashboard')
export class DashboardController {
  constructor(private readonly dashboardService: DashboardService) {}

  @Get('stats')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Get dashboard statistics and recent activity',
    description:
      'Aggregated counts across products, brands, categories, and variants, plus a few recent products. Designed as a single efficient call for the dashboard home page.',
  })
  @ApiResponse({
    status: 200,
    description: 'Dashboard stats retrieved successfully',
    schema: {
      example: {
        data: {
          products: {
            total: 47,
            active: 32,
            draft: 12,
            outOfStock: 3,
            archived: 0,
          },
          brands: { total: 12, active: 11 },
          categories: { total: 8 },
          variants: {
            lowStockCount: 5,
            outOfStockCount: 3,
            totalStockUnits: 1250,
          },
          recentProducts: [],
          lowStockVariants: [],
        },
      },
    },
  })
  @UseGuards(RolesGuard)
  @Roles('admin', 'super_admin', 'manager')
  async getStats(): Promise<{ data: DashboardStatsResponse }> {
    const stats: DashboardStatsResponse =
      await this.dashboardService.getStats();
    return { data: stats };
  }
}
