import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  ForbiddenException,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Patch,
  Post,
  UploadedFile,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import {
  ApiBearerAuth,
  ApiConsumes,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';
import * as path from 'path';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { createDiskStorage } from '../common/helpers/multer.helper';
import { ImageOptimizationService } from '../common/services/image-optimization.service';
import { AddressesService } from './address.service';
import { CreateCustomerAddressDto } from './dto/create-customer-address.dto';
import { UpdateAddressDto } from './dto/update-address.dto';
import {
  AddressDetailResponse,
  AddressListResponse,
} from './types/address-response.type';

const ALLOWED_MIME_TYPES = ['image/jpeg', 'image/png', 'image/webp'];
const MAX_FILE_SIZE = 10 * 1024 * 1024;
const UPLOAD_DIR = path.join(process.cwd(), 'uploads', 'uploads');
const storage = createDiskStorage(UPLOAD_DIR);
const fileFilter = (
  _req: unknown,
  file: Express.Multer.File,
  callback: (error: Error | null, acceptFile: boolean) => void,
) => {
  if (!ALLOWED_MIME_TYPES.includes(file.mimetype)) {
    return callback(
      new BadRequestException(
        `Invalid file type. Allowed: ${ALLOWED_MIME_TYPES.join(', ')}`,
      ),
      false,
    );
  }
  callback(null, true);
};

/**
 * Logged-in customer's own saved addresses (storefront). The user id comes from
 * the JWT (global guard), never the body, so addresses can't be spoofed.
 */
@ApiTags('Addresses (customer)')
@ApiBearerAuth()
@Controller('account/addresses')
export class AddressesCustomerController {
  constructor(
    private readonly service: AddressesService,
    private readonly optimizer: ImageOptimizationService,
  ) {}

  @Post('upload')
  @HttpCode(HttpStatus.CREATED)
  @ApiConsumes('multipart/form-data')
  @ApiOperation({ summary: 'Upload an address reference photo' })
  @UseInterceptors(
    FileInterceptor('image', {
      storage,
      fileFilter,
      limits: { fileSize: MAX_FILE_SIZE },
    }),
  )
  async uploadImage(
    @UploadedFile() file: Express.Multer.File,
  ): Promise<{ url: string }> {
    if (!file) {
      throw new BadRequestException('Image file is required');
    }
    const finalName = await this.optimizer.optimize(file.path);
    return { url: `/upload/uploads/${finalName}` };
  }

  @Get()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: "List the current customer's addresses" })
  async list(
    @CurrentUser('id') userId: string,
  ): Promise<AddressListResponse> {
    return this.service.findAll({ userId });
  }

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Add a new address' })
  async create(
    @CurrentUser('id') userId: string,
    @Body() dto: CreateCustomerAddressDto,
  ): Promise<AddressDetailResponse> {
    return this.service.create({ ...dto, userId });
  }

  @Patch(':id')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Update one of my addresses' })
  async update(
    @CurrentUser('id') userId: string,
    @Param('id') id: string,
    @Body() dto: UpdateAddressDto,
  ): Promise<AddressDetailResponse> {
    await this.assertOwnership(id, userId);
    return this.service.update(id, dto);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete one of my addresses' })
  async remove(
    @CurrentUser('id') userId: string,
    @Param('id') id: string,
  ): Promise<void> {
    await this.assertOwnership(id, userId);
    return this.service.delete(id);
  }

  private async assertOwnership(id: string, userId: string): Promise<void> {
    const { data } = await this.service.findOne(id);
    if (data.userId !== userId) {
      throw new ForbiddenException('This address does not belong to you');
    }
  }
}
