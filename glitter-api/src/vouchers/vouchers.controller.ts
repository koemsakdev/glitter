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
import { CreateVoucherDto } from './dto/create-voucher.dto';
import { UpdateVoucherDto } from './dto/update-voucher.dto';
import { ValidateVoucherDto } from './dto/validate-voucher.dto';
import { VoucherEntity } from './entities/voucher.entity';
import {
  VouchersService,
  type PublicVoucher,
  type VoucherValidation,
} from './vouchers.service';

@ApiTags('Vouchers')
@ApiBearerAuth()
@Controller('vouchers')
export class VouchersController {
  constructor(private readonly service: VouchersService) {}

  @Post('validate')
  @HttpCode(HttpStatus.OK)
  @Public()
  @ApiOperation({ summary: 'Validate a code, or get the best automatic promo' })
  async validate(
    @Body() dto: ValidateVoucherDto,
  ): Promise<{ data: VoucherValidation }> {
    return {
      data: await this.service.validate(
        dto.subtotal,
        dto.code,
        dto.shippingFee,
      ),
    };
  }

  @Get('active')
  @HttpCode(HttpStatus.OK)
  @Public()
  @ApiOperation({ summary: 'Active promos for the storefront offers list' })
  async active(): Promise<{ data: PublicVoucher[] }> {
    return { data: await this.service.findActivePublic() };
  }

  @Get()
  @HttpCode(HttpStatus.OK)
  @UseGuards(RolesGuard)
  @Roles('manager', 'admin', 'super_admin')
  @ApiOperation({ summary: 'List all vouchers' })
  async findAll(): Promise<{ data: VoucherEntity[] }> {
    return { data: await this.service.findAll() };
  }

  @Get(':id')
  @HttpCode(HttpStatus.OK)
  @UseGuards(RolesGuard)
  @Roles('manager', 'admin', 'super_admin')
  @ApiOperation({ summary: 'Get a voucher' })
  async findOne(@Param('id') id: string): Promise<{ data: VoucherEntity }> {
    return { data: await this.service.findOne(id) };
  }

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @UseGuards(RolesGuard)
  @Roles('manager', 'admin', 'super_admin')
  @ApiOperation({ summary: 'Create a voucher' })
  async create(
    @Body() dto: CreateVoucherDto,
  ): Promise<{ data: VoucherEntity }> {
    return { data: await this.service.create(dto) };
  }

  @Patch(':id')
  @HttpCode(HttpStatus.OK)
  @UseGuards(RolesGuard)
  @Roles('manager', 'admin', 'super_admin')
  @ApiOperation({ summary: 'Update a voucher' })
  async update(
    @Param('id') id: string,
    @Body() dto: UpdateVoucherDto,
  ): Promise<{ data: VoucherEntity }> {
    return { data: await this.service.update(id, dto) };
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @UseGuards(RolesGuard)
  @Roles('manager', 'admin', 'super_admin')
  @ApiOperation({ summary: 'Delete a voucher' })
  async remove(@Param('id') id: string): Promise<void> {
    await this.service.remove(id);
  }
}
