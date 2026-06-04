import { Module } from '@nestjs/common';
import { ImageOptimizationService } from './services/image-optimization.service';

@Module({
  providers: [ImageOptimizationService],
  exports: [ImageOptimizationService],
})
export class CommonModule {}
