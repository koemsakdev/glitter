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
import { CreatePageDto } from './dto/create-page.dto';
import { UpdatePageDto } from './dto/update-page.dto';
import {
  PageDetailResponse,
  PageListResponse,
} from './types/page-response.type';
import { PagesService } from './pages.service';

@ApiTags('Pages')
@ApiBearerAuth()
@Controller('pages')
export class PagesController {
  constructor(private readonly pagesService: PagesService) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @UseGuards(RolesGuard)
  @Roles('admin', 'super_admin')
  @ApiOperation({ summary: 'Create a custom page' })
  async create(@Body() dto: CreatePageDto): Promise<PageDetailResponse> {
    return this.pagesService.create(dto);
  }

  @Get()
  @HttpCode(HttpStatus.OK)
  @Public()
  @ApiOperation({ summary: 'List all custom pages' })
  async findAll(): Promise<PageListResponse> {
    return this.pagesService.findAll();
  }

  @Get('slug/:slug')
  @HttpCode(HttpStatus.OK)
  @Public()
  @ApiOperation({ summary: 'Get a page by slug' })
  async findBySlug(@Param('slug') slug: string): Promise<PageDetailResponse> {
    return this.pagesService.findBySlug(slug);
  }

  @Patch(':id')
  @HttpCode(HttpStatus.OK)
  @UseGuards(RolesGuard)
  @Roles('admin', 'super_admin')
  @ApiOperation({ summary: 'Update a page' })
  async update(
    @Param('id') id: string,
    @Body() dto: UpdatePageDto,
  ): Promise<PageDetailResponse> {
    return this.pagesService.update(id, dto);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @UseGuards(RolesGuard)
  @Roles('admin', 'super_admin')
  @ApiOperation({ summary: 'Delete a page' })
  async delete(@Param('id') id: string): Promise<void> {
    return this.pagesService.delete(id);
  }
}
