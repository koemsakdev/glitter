import { ApiProperty } from '@nestjs/swagger';
import { ArrayMaxSize, ArrayUnique, IsArray, IsString } from 'class-validator';

export class SetProductBadgesDto {
  @ApiProperty({
    type: [String],
    maxItems: 2,
    description:
      'Badge type slugs to set on the product (replaces the existing set)',
    example: ['bestseller', 'coming_soon'],
  })
  @IsArray()
  @ArrayUnique()
  @ArrayMaxSize(2)
  @IsString({ each: true })
  badgeTypes!: string[];
}
