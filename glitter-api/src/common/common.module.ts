import { Module } from '@nestjs/common';
import { ImageOptimizationService } from './services/image-optimization.service';
import { MailService } from './services/mail.service';

@Module({
  providers: [ImageOptimizationService, MailService],
  exports: [ImageOptimizationService, MailService],
})
export class CommonModule {}
