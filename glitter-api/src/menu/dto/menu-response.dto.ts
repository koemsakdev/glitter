import { ApiProperty } from '@nestjs/swagger';
import type { MenuLocation } from '../entities/menu-item.entity';

export class MenuItemResponseDto {
  @ApiProperty({ example: '550e8400-e29b-41d4-a716-446655440000' })
  id!: string;

  @ApiProperty({ example: 'Home' })
  labelEn!: string;

  @ApiProperty({ example: 'ទំព័រដើម' })
  labelKm!: string;

  @ApiProperty({ example: '/products' })
  url!: string;

  @ApiProperty({ enum: ['header', 'footer'], example: 'header' })
  location!: MenuLocation;

  @ApiProperty({ nullable: true, example: null })
  parentId!: string | null;

  @ApiProperty({ example: 0 })
  displayOrder!: number;

  @ApiProperty({ example: true })
  isActive!: boolean;

  @ApiProperty({ example: false })
  openInNewTab!: boolean;

  @ApiProperty({ example: '2025-04-18T10:00:00.000Z' })
  createdAt!: Date;

  @ApiProperty({ example: '2025-04-18T10:00:00.000Z' })
  updatedAt!: Date;
}

export class MenuDetailResponseDto {
  @ApiProperty({ type: MenuItemResponseDto })
  data!: MenuItemResponseDto;
}

export class MenuListResponseDto {
  @ApiProperty({ type: [MenuItemResponseDto] })
  data!: MenuItemResponseDto[];
}
