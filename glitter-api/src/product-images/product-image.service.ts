import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository } from 'typeorm';
import { promises as fs } from 'fs';
import * as path from 'path';
import { ProductEntity } from '../products/entities/product.entity';
import { CreateProductImageDto } from './dto/create-product-image.dto';
import { UpdateProductImageDto } from './dto/update-product-image.dto';
import { ReorderImagesDto } from './dto/reorder-images.dto';
import {
  ProductImageEntity,
  type ImageType,
} from './entities/product-image.entity';
import {
  ProductImageBulkResponse,
  ProductImageDetailResponse,
  ProductImageListResponse,
  ProductImageResponse,
} from './types/product-image-response.type';
import { ImageOptimizationService } from '../common/services/image-optimization.service';

const PRODUCT_IMAGE_UPLOAD_DIR = path.join(
  process.cwd(),
  'uploads',
  'products',
);

@Injectable()
export class ProductImagesService {
  constructor(
    @InjectRepository(ProductImageEntity)
    private readonly imageRepository: Repository<ProductImageEntity>,
    @InjectRepository(ProductEntity)
    private readonly productRepository: Repository<ProductEntity>,
    private readonly optimizer: ImageOptimizationService,
  ) {}

  /**
   * Create a single image record for a product
   */
  async create(
    dto: CreateProductImageDto,
    imageFile: Express.Multer.File,
  ): Promise<ProductImageDetailResponse> {
    if (!imageFile) {
      throw new BadRequestException('Image file is required');
    }

    const product = await this.productRepository.findOne({
      where: { id: dto.productId },
    });
    if (product === null) {
      await this.deleteFileByFilename(imageFile.filename);
      throw new BadRequestException(
        `Product with ID ${dto.productId} not found`,
      );
    }

    const imageType: ImageType = dto.imageType ?? 'gallery';

    if (imageType === 'primary') {
      await this.demoteExistingPrimary(dto.productId);
    }

    // Optimize: generates 3 variants, returns new filename
    const optimizedFilename = await this.optimizer.optimize(imageFile.path);

    const entity = this.imageRepository.create({
      productId: dto.productId,
      imageUrl: `/upload/products/${optimizedFilename}`,
      imageAltTextEn: dto.imageAltTextEn ?? null,
      imageAltTextKm: dto.imageAltTextKm ?? null,
      imageType,
      displayOrder: dto.displayOrder ?? 0,
    });

    const saved = await this.imageRepository.save(entity);

    return {
      data: this.toResponse(saved),
    };
  }

  /**
   * Bulk upload multiple images for a product at once
   */
  async createBulk(
    productId: string,
    imageFiles: Express.Multer.File[],
    imageType: ImageType = 'gallery',
  ): Promise<ProductImageBulkResponse> {
    if (!imageFiles || imageFiles.length === 0) {
      throw new BadRequestException('At least one image file is required');
    }

    const product = await this.productRepository.findOne({
      where: { id: productId },
    });
    if (product === null) {
      await Promise.all(
        imageFiles.map((file) => this.deleteFileByFilename(file.filename)),
      );
      throw new BadRequestException(`Product with ID ${productId} not found`);
    }

    if (imageType === 'primary') {
      await this.demoteExistingPrimary(productId);
    }

    const lastImage = await this.imageRepository.findOne({
      where: { productId },
      order: { displayOrder: 'DESC' },
    });
    let nextOrder = lastImage ? lastImage.displayOrder + 1 : 0;

    // Optimize all files in parallel — each one generates 3 variants
    const optimizedFilenames = await Promise.all(
      imageFiles.map((file) => this.optimizer.optimize(file.path)),
    );

    const entities = imageFiles.map((_file, idx) => {
      const filename = optimizedFilenames[idx];
      return this.imageRepository.create({
        productId,
        imageUrl: `/upload/products/${filename}`,
        imageAltTextEn: null,
        imageAltTextKm: null,
        imageType,
        displayOrder: nextOrder++,
      });
    });

    const saved = await this.imageRepository.save(entities);

    return {
      data: saved.map((entity: ProductImageEntity) => this.toResponse(entity)),
      total: saved.length,
      uploaded: saved.length,
    };
  }

  async findByProduct(productId: string): Promise<ProductImageListResponse> {
    const product = await this.productRepository.findOne({
      where: { id: productId },
    });
    if (product === null) {
      throw new NotFoundException(`Product with ID ${productId} not found`);
    }

    const [images, total] = await this.imageRepository.findAndCount({
      where: { productId },
      order: {
        displayOrder: 'ASC',
        createdAt: 'ASC',
      },
    });

    return {
      data: images.map((image: ProductImageEntity) => this.toResponse(image)),
      total: Number(total),
    };
  }

  async findPrimary(productId: string): Promise<ProductImageDetailResponse> {
    const image = await this.imageRepository.findOne({
      where: { productId, imageType: 'primary' },
    });

    if (image === null) {
      throw new NotFoundException(
        `No primary image found for product ${productId}`,
      );
    }

    return {
      data: this.toResponse(image),
    };
  }

  async findOne(id: string): Promise<ProductImageDetailResponse> {
    const image = await this.imageRepository.findOne({ where: { id } });

    if (image === null) {
      throw new NotFoundException(`Image with ID ${id} not found`);
    }

    return {
      data: this.toResponse(image),
    };
  }

  async update(
    id: string,
    dto: UpdateProductImageDto,
    imageFile?: Express.Multer.File,
  ): Promise<ProductImageDetailResponse> {
    const image = await this.imageRepository.findOne({ where: { id } });

    if (image === null) {
      if (imageFile) {
        await this.deleteFileByFilename(imageFile.filename);
      }
      throw new NotFoundException(`Image with ID ${id} not found`);
    }

    if (dto.imageType === 'primary' && image.imageType !== 'primary') {
      await this.demoteExistingPrimary(image.productId);
    }

    if (dto.imageAltTextEn !== undefined) {
      image.imageAltTextEn = dto.imageAltTextEn ?? null;
    }
    if (dto.imageAltTextKm !== undefined) {
      image.imageAltTextKm = dto.imageAltTextKm ?? null;
    }
    if (dto.imageType !== undefined) {
      image.imageType = dto.imageType;
    }
    if (dto.displayOrder !== undefined) {
      image.displayOrder = dto.displayOrder;
    }

    // Handle file replacement — delete all old variants, optimize the new file
    if (imageFile) {
      await this.deleteImageFile(image.imageUrl);
      const optimizedFilename = await this.optimizer.optimize(imageFile.path);
      image.imageUrl = `/upload/products/${optimizedFilename}`;
    }

    const updated = await this.imageRepository.save(image);

    return {
      data: this.toResponse(updated),
    };
  }

  async reorder(
    productId: string,
    dto: ReorderImagesDto,
  ): Promise<ProductImageListResponse> {
    const product = await this.productRepository.findOne({
      where: { id: productId },
    });
    if (product === null) {
      throw new NotFoundException(`Product with ID ${productId} not found`);
    }

    const imageIds = dto.items.map((item) => item.id);
    const images = await this.imageRepository.find({
      where: { id: In(imageIds), productId },
    });

    if (images.length !== dto.items.length) {
      throw new BadRequestException(
        'One or more image IDs are invalid or do not belong to this product',
      );
    }

    const orderMap = new Map(
      dto.items.map((item) => [item.id, item.displayOrder]),
    );

    for (const image of images) {
      const newOrder = orderMap.get(image.id);
      if (newOrder !== undefined) {
        image.displayOrder = newOrder;
      }
    }

    await this.imageRepository.save(images);

    return this.findByProduct(productId);
  }

  async delete(id: string): Promise<void> {
    const image = await this.imageRepository.findOne({ where: { id } });

    if (image === null) {
      throw new NotFoundException(`Image with ID ${id} not found`);
    }

    // Deletes original + medium + thumb variants
    await this.deleteImageFile(image.imageUrl);

    await this.imageRepository.remove(image);
  }

  async deleteByProduct(productId: string): Promise<void> {
    const images = await this.imageRepository.find({ where: { productId } });

    if (images.length === 0) {
      return;
    }

    await Promise.all(
      images.map((image) => this.deleteImageFile(image.imageUrl)),
    );

    await this.imageRepository.remove(images);
  }

  private async demoteExistingPrimary(productId: string): Promise<void> {
    const existingPrimary = await this.imageRepository.findOne({
      where: { productId, imageType: 'primary' },
    });

    if (existingPrimary !== null) {
      existingPrimary.imageType = 'gallery';
      await this.imageRepository.save(existingPrimary);
    }
  }

  /**
   * Delete an image's original file plus
   */
  private async deleteImageFile(imageUrl: string): Promise<void> {
    try {
      if (!imageUrl || !imageUrl.startsWith('/upload/products/')) {
        return;
      }
      const filename = imageUrl.replace('/upload/products/', '');
      await this.deleteFileByFilename(filename);
    } catch (error) {
      console.error('Error deleting image file:', error);
    }
  }

  /**
   * Delete a single file by filename (used for cleanup on upload errors,
   * where the file hasn't been optimized yet — no variants to clean up).
   */
  private async deleteFileByFilename(filename: string): Promise<void> {
    try {
      const filePath = path.join(PRODUCT_IMAGE_UPLOAD_DIR, filename);
      await fs.unlink(filePath);
    } catch (error) {
      if (
        error instanceof Error &&
        'code' in error &&
        error.code === 'ENOENT'
      ) {
        return;
      }
      console.error('Error deleting file:', error);
    }
  }

  private toResponse(entity: ProductImageEntity): ProductImageResponse {
    return {
      id: entity.id,
      productId: entity.productId,
      imageUrl: entity.imageUrl,
      imageAltTextEn: entity.imageAltTextEn,
      imageAltTextKm: entity.imageAltTextKm,
      imageType: entity.imageType,
      displayOrder: entity.displayOrder,
      createdAt: entity.createdAt,
    };
  }
}
