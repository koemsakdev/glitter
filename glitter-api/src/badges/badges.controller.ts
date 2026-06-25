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
import { CreateBadgeDto } from './dto/create-badge.dto';
import { UpdateBadgeDto } from './dto/update-badge.dto';
import { BadgeEntity } from './entities/badge.entity';
import { BadgesService } from './badges.service';

@ApiTags('Badges')
@ApiBearerAuth()
@Controller('badges')
export class BadgesController {
  constructor(private readonly service: BadgesService) {}

  @Get()
  @HttpCode(HttpStatus.OK)
  @Public()
  @ApiOperation({ summary: 'List all badges' })
  async findAll(): Promise<{ data: BadgeEntity[] }> {
    return { data: await this.service.findAll() };
  }

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @UseGuards(RolesGuard)
  @Roles('manager', 'admin', 'super_admin')
  @ApiOperation({ summary: 'Create a badge' })
  async create(@Body() dto: CreateBadgeDto): Promise<{ data: BadgeEntity }> {
    return { data: await this.service.create(dto) };
  }

  @Patch(':id')
  @HttpCode(HttpStatus.OK)
  @UseGuards(RolesGuard)
  @Roles('manager', 'admin', 'super_admin')
  @ApiOperation({ summary: 'Update a badge' })
  async update(
    @Param('id') id: string,
    @Body() dto: UpdateBadgeDto,
  ): Promise<{ data: BadgeEntity }> {
    return { data: await this.service.update(id, dto) };
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @UseGuards(RolesGuard)
  @Roles('manager', 'admin', 'super_admin')
  @ApiOperation({ summary: 'Delete a badge' })
  async delete(@Param('id') id: string): Promise<void> {
    return this.service.delete(id);
  }
}
