import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsArray,
  IsInt,
  IsOptional,
  IsUUID,
  Min,
  ValidateNested,
} from 'class-validator';

export class ReorderMenuItemDto {
  @ApiProperty({ description: 'Menu item id' })
  @IsUUID()
  id!: string;

  @ApiProperty({ description: 'New sort order', example: 0 })
  @IsInt()
  @Min(0)
  displayOrder!: number;

  @ApiPropertyOptional({
    description: 'New parent id (or null for a top-level item)',
    nullable: true,
  })
  @IsOptional()
  @IsUUID()
  parentId?: string | null;
}

export class ReorderMenuDto {
  @ApiProperty({ type: [ReorderMenuItemDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ReorderMenuItemDto)
  items!: ReorderMenuItemDto[];
}
