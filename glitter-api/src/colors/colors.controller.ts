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
import { CreateColorDto } from './dto/create-color.dto';
import { UpdateColorDto } from './dto/update-color.dto';
import { ColorEntity } from './entities/color.entity';
import { ColorsService } from './colors.service';

@ApiTags('Colors')
@ApiBearerAuth()
@Controller('colors')
export class ColorsController {
  constructor(private readonly service: ColorsService) {}

  @Get()
  @HttpCode(HttpStatus.OK)
  @Public()
  @ApiOperation({ summary: 'List all colors' })
  async findAll(): Promise<{ data: ColorEntity[] }> {
    return { data: await this.service.findAll() };
  }

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @UseGuards(RolesGuard)
  @Roles('manager', 'admin', 'super_admin')
  @ApiOperation({ summary: 'Create a color' })
  async create(@Body() dto: CreateColorDto): Promise<{ data: ColorEntity }> {
    return { data: await this.service.create(dto) };
  }

  @Patch(':id')
  @HttpCode(HttpStatus.OK)
  @UseGuards(RolesGuard)
  @Roles('manager', 'admin', 'super_admin')
  @ApiOperation({ summary: 'Update a color' })
  async update(
    @Param('id') id: string,
    @Body() dto: UpdateColorDto,
  ): Promise<{ data: ColorEntity }> {
    return { data: await this.service.update(id, dto) };
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @UseGuards(RolesGuard)
  @Roles('manager', 'admin', 'super_admin')
  @ApiOperation({ summary: 'Delete a color' })
  async delete(@Param('id') id: string): Promise<void> {
    return this.service.delete(id);
  }
}
