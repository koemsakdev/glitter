import { ApiProperty } from '@nestjs/swagger';
import { ArrayUnique, IsArray, IsUUID } from 'class-validator';

export class SetRelatedProductsDto {
  @ApiProperty({
    type: [String],
    description:
      'Ordered list of related product IDs (replaces the existing set)',
  })
  @IsArray()
  @ArrayUnique()
  @IsUUID('4', { each: true })
  relatedProductIds!: string[];
}
