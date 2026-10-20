import {
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { Roles } from '../auth/decorators/roles.decorator';
import { RolesGuard } from '../auth/guards/roles.guard';
import { resolveBranchScope } from '../common/helpers/branch-scope.helper';
import { UserEntity } from '../users/entities/user.entity';
import { OrderExportRow, ReportsService, SalesReport } from './reports.service';

@ApiTags('Reports')
@ApiBearerAuth()
@Controller('reports')
@UseGuards(RolesGuard)
@Roles('admin', 'manager')
export class ReportsController {
  constructor(private readonly service: ReportsService) {}

  @Get('sales')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary:
      'Sales report for a date range (managers: own branch; admins: any/all)',
  })
  async sales(
    @CurrentUser() user: UserEntity,
    @Query('from') from?: string,
    @Query('to') to?: string,
    @Query('branchId') branchId?: string,
  ): Promise<{ data: SalesReport }> {
    const valid = (d?: string) =>
      d && /^\d{4}-\d{2}-\d{2}$/.test(d) ? d : undefined;
    return {
      data: await this.service.sales({
        from: valid(from),
        to: valid(to),
        branchId: resolveBranchScope(user, branchId),
      }),
    };
  }

  @Get('orders')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Every order in a date range (for CSV export)' })
  async orders(
    @CurrentUser() user: UserEntity,
    @Query('from') from?: string,
    @Query('to') to?: string,
    @Query('branchId') branchId?: string,
  ): Promise<{
    data: { range: { from: string; to: string }; rows: OrderExportRow[] };
  }> {
    const valid = (d?: string) =>
      d && /^\d{4}-\d{2}-\d{2}$/.test(d) ? d : undefined;
    return {
      data: await this.service.orders({
        from: valid(from),
        to: valid(to),
        branchId: resolveBranchScope(user, branchId),
      }),
    };
  }
}
