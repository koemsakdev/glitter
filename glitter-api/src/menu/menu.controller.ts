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
import {
  ApiBearerAuth,
  ApiOperation,
  ApiParam,
  ApiQuery,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { Public } from '../auth/decorators/public.decorator';
import { Roles } from '../auth/decorators/roles.decorator';
import { RolesGuard } from '../auth/guards/roles.guard';
import { CreateMenuItemDto } from './dto/create-menu-item.dto';
import { UpdateMenuItemDto } from './dto/update-menu-item.dto';
import { ReorderMenuDto } from './dto/reorder-menu.dto';
import {
  MenuDetailResponseDto,
  MenuListResponseDto,
} from './dto/menu-response.dto';
import type { MenuLocation } from './entities/menu-item.entity';
import {
  MenuDetailResponse,
  MenuListResponse,
} from './types/menu-response.type';
import { MenuService } from './menu.service';

@ApiTags('Menu')
@ApiBearerAuth()
@Controller('menu')
export class MenuController {
  constructor(private readonly menuService: MenuService) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @UseGuards(RolesGuard)
  @Roles('admin', 'super_admin')
  @ApiOperation({ summary: 'Create a navigation menu item' })
  @ApiResponse({ status: 201, type: MenuDetailResponseDto })
  async create(@Body() dto: CreateMenuItemDto): Promise<MenuDetailResponse> {
    return this.menuService.create(dto);
  }

  @Get()
  @HttpCode(HttpStatus.OK)
  @Public()
  @ApiOperation({
    summary: 'List menu items',
    description:
      'Flat list ordered by displayOrder. Filter by location and active state.',
  })
  @ApiQuery({ name: 'location', enum: ['header', 'footer'], required: false })
  @ApiQuery({ name: 'isActive', enum: ['true', 'false'], required: false })
  @ApiResponse({ status: 200, type: MenuListResponseDto })
  async findAll(
    @Query('location') location?: MenuLocation,
    @Query('isActive') isActive?: string,
  ): Promise<MenuListResponse> {
    const activeFilter =
      isActive === undefined ? undefined : isActive === 'true';
    return this.menuService.findAll(location, activeFilter);
  }

  @Patch('reorder')
  @HttpCode(HttpStatus.OK)
  @UseGuards(RolesGuard)
  @Roles('admin', 'super_admin')
  @ApiOperation({ summary: 'Bulk reorder / re-parent menu items' })
  @ApiResponse({ status: 200, type: MenuListResponseDto })
  async reorder(@Body() dto: ReorderMenuDto): Promise<MenuListResponse> {
    return this.menuService.reorder(dto);
  }

  @Get(':id')
  @HttpCode(HttpStatus.OK)
  @Public()
  @ApiOperation({ summary: 'Get a menu item by id' })
  @ApiParam({ name: 'id', type: String })
  @ApiResponse({ status: 200, type: MenuDetailResponseDto })
  @ApiResponse({ status: 404, description: 'Menu item not found' })
  async findOne(@Param('id') id: string): Promise<MenuDetailResponse> {
    return this.menuService.findOne(id);
  }

  @Patch(':id')
  @HttpCode(HttpStatus.OK)
  @UseGuards(RolesGuard)
  @Roles('admin', 'super_admin')
  @ApiOperation({ summary: 'Update a menu item' })
  @ApiParam({ name: 'id', type: String })
  @ApiResponse({ status: 200, type: MenuDetailResponseDto })
  @ApiResponse({ status: 404, description: 'Menu item not found' })
  async update(
    @Param('id') id: string,
    @Body() dto: UpdateMenuItemDto,
  ): Promise<MenuDetailResponse> {
    return this.menuService.update(id, dto);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @UseGuards(RolesGuard)
  @Roles('admin', 'super_admin')
  @ApiOperation({
    summary: 'Delete a menu item',
    description: 'Also removes its sub-items.',
  })
  @ApiParam({ name: 'id', type: String })
  @ApiResponse({ status: 204, description: 'Deleted' })
  @ApiResponse({ status: 404, description: 'Menu item not found' })
  async delete(@Param('id') id: string): Promise<void> {
    return this.menuService.delete(id);
  }
}
