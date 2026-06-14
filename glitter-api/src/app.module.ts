/**
 * ============================================================================
 * APP MODULE — SECURITY MODEL
 * ============================================================================
 *
 * JwtAuthGuard is registered GLOBALLY via APP_GUARD below.
 * This means EVERY endpoint requires a valid JWT by default.
 *
 * To make an endpoint public, add the @Public() decorator:
 *   @Public()
 *   @Get('public-products')
 *   listProducts() {...}
 *
 * For role-based access, add @UseGuards(RolesGuard) + @Roles() to the endpoint:
 *   @UseGuards(RolesGuard)
 *   @Roles('admin', 'super_admin')
 *   @Post()
 *   createProduct() {...}
 *
 * (RolesGuard is NOT global because it would fail on routes without @Roles,
 *  and most routes don't need role checking beyond "logged in".)
 *
 * ============================================================================
 */
import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { APP_GUARD } from '@nestjs/core';
import { ServeStaticModule } from '@nestjs/serve-static';
import { TypeOrmModule } from '@nestjs/typeorm';
import { join } from 'path';
import { AddressesModule } from './addresses/address.module';
import { AppSettingsModule } from './app-settings/app-settings.module';
import { AuthModule } from './auth/auth.module';
import { JwtAuthGuard } from './auth/guards/jwt-auth.guard';
import { BranchModule } from './branch/branch.module';
import { BrandsModule } from './brands/brands.module';
import { CategoriesModule } from './category/category.module';
import { InventoryBranchModule } from './inventory-branch/inventory-branch.module';
import { OrdersModule } from './orders/orders.module';
import { ProductBadgesModule } from './product-badges/product-badge.module';
import { ProductImagesModule } from './product-images/product-image.module';
import { ProductVariantsModule } from './product-variants/product-variant.module';
import { ProductsModule } from './products/product.module';
import { StaffModule } from './staff/staff.module';
import { UsersModule } from './users/user.module';
import { SeedModule } from './seed/seed.module';
import { AiModule } from './ai/ai.module';
import { DashboardModule } from './dashboard/dashboard.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    TypeOrmModule.forRootAsync({
      useFactory: () => ({
        type: 'postgres',
        url: process.env.DATABASE_URL,
        autoLoadEntities: true,
        synchronize: true, // dev only — use migrations in prod
        ssl: { rejectUnauthorized: false },
      }),
    }),
    ServeStaticModule.forRoot({
      rootPath: join(process.cwd(), 'uploads'),
      serveRoot: '/upload',
    }),
    // Business modules
    AuthModule,
    AppSettingsModule,
    BranchModule,
    StaffModule,
    CategoriesModule,
    BrandsModule,
    ProductsModule,
    ProductImagesModule,
    ProductVariantsModule,
    ProductBadgesModule,
    InventoryBranchModule,
    OrdersModule,
    UsersModule,
    AddressesModule,
    SeedModule,
    AiModule,
    DashboardModule,
  ],
  providers: [
    {
      provide: APP_GUARD,
      useClass: JwtAuthGuard,
    },
  ],
})
export class AppModule {}
