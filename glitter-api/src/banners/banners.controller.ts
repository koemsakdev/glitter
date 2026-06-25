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
import { CreateBannerDto } from './dto/create-banner.dto';
import { UpdateBannerDto } from './dto/update-banner.dto';
import type { BannerPlacement } from './entities/banner-placement.entity';
import { BannersService } from './banners.service';
import {
  BannerDetailResponse,
  BannerListResponse,
  BannerResponse,
} from './types/banner-response.type';

@ApiTags('Banners')
@ApiBearerAuth()
@Controller('banners')
export class BannersController {
  constructor(private readonly service: BannersService) {}

  @Get()
  @HttpCode(HttpStatus.OK)
  @UseGuards(RolesGuard)
  @Roles('admin', 'super_admin')
  @ApiOperation({ summary: 'List all banners' })
  async findAll(): Promise<BannerListResponse> {
    return this.service.findAll();
  }

  @Get('placement/:location')
  @HttpCode(HttpStatus.OK)
  @Public()
  @ApiOperation({ summary: 'Active banners for a placement (storefront)' })
  async findByPlacement(
    @Param('location') location: BannerPlacement,
  ): Promise<{ data: BannerResponse[] }> {
    return { data: await this.service.findActiveByPlacement(location) };
  }

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @UseGuards(RolesGuard)
  @Roles('admin', 'super_admin')
  @ApiOperation({ summary: 'Create a banner' })
  async create(@Body() dto: CreateBannerDto): Promise<BannerDetailResponse> {
    return { data: await this.service.create(dto) };
  }

  @Patch(':id')
  @HttpCode(HttpStatus.OK)
  @UseGuards(RolesGuard)
  @Roles('admin', 'super_admin')
  @ApiOperation({ summary: 'Update a banner' })
  async update(
    @Param('id') id: string,
    @Body() dto: UpdateBannerDto,
  ): Promise<BannerDetailResponse> {
    return { data: await this.service.update(id, dto) };
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @UseGuards(RolesGuard)
  @Roles('admin', 'super_admin')
  @ApiOperation({ summary: 'Delete a banner' })
  async delete(@Param('id') id: string): Promise<void> {
    return this.service.delete(id);
  }
}
