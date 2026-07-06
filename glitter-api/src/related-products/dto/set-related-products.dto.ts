import { ApiProperty } from '@nestjs/swagger';
import { ArrayMaxSize, ArrayUnique, IsArray, IsUUID } from 'class-validator';

export class SetRelatedProductsDto {
  @ApiProperty({
    type: [String],
    maxItems: 10,
    description:
      'Ordered list of related product IDs (replaces the existing set, max 10)',
  })
  @IsArray()
  @ArrayUnique()
  @ArrayMaxSize(10)
  @IsUUID('4', { each: true })
  relatedProductIds!: string[];
}
