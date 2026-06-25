import { ApiProperty } from '@nestjs/swagger';
import { IsEnum } from 'class-validator';
import type { ReviewStatus } from '../entities/review.entity';

export class UpdateReviewStatusDto {
  @ApiProperty({ enum: ['pending', 'approved', 'hidden'] })
  @IsEnum(['pending', 'approved', 'hidden'])
  status!: ReviewStatus;
}
