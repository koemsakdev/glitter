import { Module } from '@nestjs/common';
import { ImageOptimizationService } from '../common/services/image-optimization.service';
import { UploadsController } from './uploads.controller';

@Module({
  controllers: [UploadsController],
  providers: [ImageOptimizationService],
})
export class UploadsModule {}
