import { Module } from '@nestjs/common';
import { AppSettingsModule } from '../app-settings/app-settings.module';
import { AuthModule } from '../auth/auth.module';
import { OrdersModule } from '../orders/orders.module';
import { ProductsModule } from '../products/product.module';
import { AiChatController } from './ai-chat.controller';
import { AiChatService } from './ai-chat.service';
import { AiController } from './ai.controller';
import { AiService } from './ai.service';

@Module({
  imports: [ProductsModule, OrdersModule, AppSettingsModule, AuthModule],
  controllers: [AiController, AiChatController],
  providers: [AiService, AiChatService],
  exports: [AiService],
})
export class AiModule {}
