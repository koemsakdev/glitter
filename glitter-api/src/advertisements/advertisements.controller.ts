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
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Public } from '../auth/decorators/public.decorator';
import { Roles } from '../auth/decorators/roles.decorator';
import { RolesGuard } from '../auth/guards/roles.guard';
import { CreateAdvertisementDto } from './dto/create-advertisement.dto';
import { UpdateAdvertisementDto } from './dto/update-advertisement.dto';
import type { PlacementLocation } from './entities/ad-placement.entity';
import { AdvertisementsService } from './advertisements.service';
import {
  AdvertisementDetailResponse,
  AdvertisementListResponse,
  AdvertisementResponse,
} from './types/advertisement-response.type';

@ApiTags('Advertisements')
@ApiBearerAuth()
@Controller('advertisements')
export class AdvertisementsController {
  constructor(private readonly service: AdvertisementsService) {}

  @Get()
  @HttpCode(HttpStatus.OK)
  @UseGuards(RolesGuard)
  @Roles('admin', 'super_admin')
  @ApiOperation({ summary: 'List all advertisements' })
  async findAll(): Promise<AdvertisementListResponse> {
    return this.service.findAll();
  }

  @Get('placement/:location')
  @HttpCode(HttpStatus.OK)
  @Public()
  @ApiOperation({ summary: 'Active ads for a placement (storefront)' })
  async findByPlacement(
    @Param('location') location: PlacementLocation,
  ): Promise<{ data: AdvertisementResponse[] }> {
    return { data: await this.service.findActiveByPlacement(location) };
  }

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @UseGuards(RolesGuard)
  @Roles('admin', 'super_admin')
  @ApiOperation({ summary: 'Create an advertisement' })
  async create(
    @Body() dto: CreateAdvertisementDto,
  ): Promise<AdvertisementDetailResponse> {
    return { data: await this.service.create(dto) };
  }

  @Patch(':id')
  @HttpCode(HttpStatus.OK)
  @UseGuards(RolesGuard)
  @Roles('admin', 'super_admin')
  @ApiOperation({ summary: 'Update an advertisement' })
  async update(
    @Param('id') id: string,
    @Body() dto: UpdateAdvertisementDto,
  ): Promise<AdvertisementDetailResponse> {
    return { data: await this.service.update(id, dto) };
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @UseGuards(RolesGuard)
  @Roles('admin', 'super_admin')
  @ApiOperation({ summary: 'Delete an advertisement' })
  async delete(@Param('id') id: string): Promise<void> {
    return this.service.delete(id);
  }

  @Post(':id/view')
  @HttpCode(HttpStatus.NO_CONTENT)
  @Public()
  @ApiOperation({ summary: 'Record an impression' })
  async recordView(@Param('id') id: string): Promise<void> {
    return this.service.recordView(id);
  }

  @Post(':id/click')
  @HttpCode(HttpStatus.NO_CONTENT)
  @Public()
  @ApiOperation({ summary: 'Record a click' })
  async recordClick(@Param('id') id: string): Promise<void> {
    return this.service.recordClick(id);
  }
}
