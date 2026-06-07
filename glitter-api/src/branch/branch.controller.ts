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
} from '@nestjs/common';
import { CreateBranchDto } from './dto/create-branch.dto';
import { UpdateBranchDto } from './dto/update-branch.dto';
import { BranchesService } from './branch.service';
import {
  BranchDetailResponse,
  BranchListResponse,
  BranchResponse,
} from './types/branch-response.type';
import { UseGuards } from '@nestjs/common';
import { ApiBearerAuth } from '@nestjs/swagger';
import { Public } from '../auth/decorators/public.decorator';
import { Roles } from '../auth/decorators/roles.decorator';
import { RolesGuard } from '../auth/guards/roles.guard';

@ApiBearerAuth()
@Controller('branches')
export class BranchesController {
  constructor(private readonly branchesService: BranchesService) {}

  @UseGuards(RolesGuard)
  @Roles('admin', 'super_admin')
  /**
   * Create a new branch
   * POST /branches
   */
  @Post()
  @HttpCode(HttpStatus.CREATED)
  async create(@Body() dto: CreateBranchDto): Promise<BranchDetailResponse> {
    return this.branchesService.create(dto);
  }

  @Public()
  /**
   * Get all branches with pagination
   * GET /branches?page=1&limit=10
   */
  @Get()
  @HttpCode(HttpStatus.OK)
  async findAll(
    @Query('page') page: string = '1',
    @Query('limit') limit: string = '10',
  ): Promise<BranchListResponse> {
    const pageNum = parseInt(page, 10);
    const limitNum = parseInt(limit, 10);
    return this.branchesService.findAll(pageNum, limitNum);
  }

  @Public()
  /**
   * Get all active branches
   * GET /branches/status/active
   */
  @Get('status/active')
  @HttpCode(HttpStatus.OK)
  async findActive(): Promise<BranchListResponse> {
    return this.branchesService.findActive();
  }

  @Public()
  /**
   * Get a specific branch by ID
   * GET /branches/:id
   */
  @Get(':id')
  @HttpCode(HttpStatus.OK)
  async findOne(@Param('id') id: string): Promise<BranchDetailResponse> {
    return this.branchesService.findOne(id);
  }

  @Public()
  /**
   * Get a specific branch by code
   * GET /branches/code/:code
   */
  @Get('code/:code')
  @HttpCode(HttpStatus.OK)
  async findByCode(@Param('code') code: string): Promise<BranchDetailResponse> {
    return this.branchesService.findByCode(code);
  }

  @UseGuards(RolesGuard)
  @Roles('admin', 'super_admin')
  /**
   * Update a branch
   * PATCH /branches/:id
   */
  @Patch(':id')
  @HttpCode(HttpStatus.OK)
  async update(
    @Param('id') id: string,
    @Body() dto: UpdateBranchDto,
  ): Promise<BranchDetailResponse> {
    return this.branchesService.update(id, dto);
  }

  @UseGuards(RolesGuard)
  @Roles('super_admin')
  /**
   * Delete a branch
   * DELETE /branches/:id
   */
  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  async delete(@Param('id') id: string): Promise<void> {
    return this.branchesService.delete(id);
  }
}
