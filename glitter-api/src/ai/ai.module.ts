import { Module } from '@nestjs/common';
import { AppSettingsModule } from '../app-settings/app-settings.module';
import { AuthModule } from '../auth/auth.module';
import { BranchModule } from '../branch/branch.module';
import { BrandsModule } from '../brands/brands.module';
import { CategoriesModule } from '../category/category.module';
import { OrdersModule } from '../orders/orders.module';
import { ProductsModule } from '../products/product.module';
import { VouchersModule } from '../vouchers/vouchers.module';
import { AiChatController } from './ai-chat.controller';
import { AiChatService } from './ai-chat.service';
import { AiController } from './ai.controller';
import { AiService } from './ai.service';

@Module({
  imports: [
    ProductsModule,
    OrdersModule,
    AppSettingsModule,
    AuthModule,
    BranchModule,
    BrandsModule,
    CategoriesModule,
    VouchersModule,
  ],
  controllers: [AiController, AiChatController],
  providers: [AiService, AiChatService],
  exports: [AiService],
})
export class AiModule {}
