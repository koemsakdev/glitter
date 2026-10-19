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
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { Roles } from '../auth/decorators/roles.decorator';
import {
  assertBranchAccess,
  resolveBranchScope,
} from '../common/helpers/branch-scope.helper';
import { UserEntity } from '../users/entities/user.entity';
import { RolesGuard } from '../auth/guards/roles.guard';
import { CreateShipmentDto } from './dto/create-shipment.dto';
import { UpdateShipmentDto } from './dto/update-shipment.dto';
import type { ShipmentStatus } from './entities/shipment.entity';
import { ShipmentsService } from './shipments.service';
import {
  ShipmentDetailResponse,
  ShipmentListResponse,
  ShipmentResponse,
} from './types/shipment-response.type';

@ApiTags('Shipments')
@ApiBearerAuth()
@UseGuards(RolesGuard)
@Roles('cashier', 'manager', 'admin')
@Controller('shipments')
export class ShipmentsController {
  constructor(private readonly service: ShipmentsService) {}

  @Get()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'List shipments (optionally by status)' })
  async findAll(
    @CurrentUser() user: UserEntity,
    @Query('status') status?: ShipmentStatus,
  ): Promise<ShipmentListResponse> {
    return this.service.findAll(status, resolveBranchScope(user));
  }

  @Get('order/:orderId')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Shipment for an order (or null)' })
  async findByOrder(
    @Param('orderId') orderId: string,
    @CurrentUser() user: UserEntity,
  ): Promise<ShipmentDetailResponse> {
    assertBranchAccess(user, await this.service.branchOfOrder(orderId));
    return { data: await this.service.findByOrder(orderId) };
  }

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Create a shipment for an order' })
  async create(
    @Body() dto: CreateShipmentDto,
    @CurrentUser() user: UserEntity,
  ): Promise<ShipmentResponse> {
    assertBranchAccess(user, await this.service.branchOfOrder(dto.orderId));
    return this.service.create(dto);
  }

  @Patch(':id')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Update a shipment' })
  async update(
    @Param('id') id: string,
    @Body() dto: UpdateShipmentDto,
    @CurrentUser() user: UserEntity,
  ): Promise<ShipmentResponse> {
    assertBranchAccess(user, await this.service.branchOfShipment(id));
    return this.service.update(id, dto);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @Roles('manager', 'admin')
  @ApiOperation({ summary: 'Delete a shipment' })
  async delete(
    @Param('id') id: string,
    @CurrentUser() user: UserEntity,
  ): Promise<void> {
    assertBranchAccess(user, await this.service.branchOfShipment(id));
    return this.service.delete(id);
  }
}
