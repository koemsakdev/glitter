import {
  BadRequestException,
  Body,
  Controller,
  HttpCode,
  HttpStatus,
  Post,
  UploadedFile,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import {
  ApiConsumes,
  ApiOperation,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import * as path from 'path';
import { Public } from '../auth/decorators/public.decorator';
import { createDiskStorage } from '../common/helpers/multer.helper';
import { ImageOptimizationService } from '../common/services/image-optimization.service';
import { CreateOnlineOrderDto } from './dto/create-online-order.dto';
import { OrdersService } from './orders.service';
import { OrderDetailResponse } from './types/order-response.type';

const ALLOWED_MIME_TYPES = ['image/jpeg', 'image/png', 'image/webp'];
const MAX_PROOF_SIZE = 10 * 1024 * 1024; // 10 MB
const UPLOAD_DIR = path.join(process.cwd(), 'uploads', 'uploads');
const proofStorage = createDiskStorage(UPLOAD_DIR);
const proofFileFilter = (
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
 * Public storefront checkout. No auth — creates a pending online order that
 * reserves stock. Kept separate from the admin OrdersController so it isn't
 * behind the roles guard.
 */
@ApiTags('Orders (public)')
@Controller('orders')
export class OrdersPublicController {
  constructor(
    private readonly service: OrdersService,
    private readonly optimizer: ImageOptimizationService,
  ) {}

  @Public()
  @Post('online')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({
    summary: 'Place an online order (guest checkout)',
    description:
      'Creates a pending online order and reserves stock. Prices + delivery fee are computed server-side.',
  })
  @ApiResponse({ status: 201, description: 'Order placed' })
  async createOnline(
    @Body() dto: CreateOnlineOrderDto,
  ): Promise<OrderDetailResponse> {
    return this.service.create(
      {
        source: 'online',
        branchId: dto.branchId,
        customerName: dto.customerName,
        customerPhone: dto.customerPhone,
        note: dto.note,
        items: dto.items,
        deliveryRegion: dto.deliveryRegion,
        deliveryMethod: dto.deliveryMethod,
        deliveryAddress: dto.deliveryAddress,
        deliveryLat: dto.deliveryLat,
        deliveryLng: dto.deliveryLng,
        paymentMethod: dto.paymentMethod,
        paymentProofUrl: dto.paymentProofUrl,
        voucherCode: dto.voucherCode,
      },
      '',
    );
  }

  @Public()
  @Post('payment-proof')
  @HttpCode(HttpStatus.CREATED)
  @ApiConsumes('multipart/form-data')
  @ApiOperation({ summary: 'Upload a KHQR payment screenshot' })
  @UseInterceptors(
    FileInterceptor('image', {
      storage: proofStorage,
      fileFilter: proofFileFilter,
      limits: { fileSize: MAX_PROOF_SIZE },
    }),
  )
  async uploadProof(
    @UploadedFile() file: Express.Multer.File,
  ): Promise<{ url: string }> {
    if (!file) {
      throw new BadRequestException('Image file is required');
    }
    const finalName = await this.optimizer.optimize(file.path);
    return { url: `/upload/uploads/${finalName}` };
  }
}
