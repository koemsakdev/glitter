import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { BannersController } from './banners.controller';
import { BannersService } from './banners.service';
import { BannerEntity } from './entities/banner.entity';
import { BannerPlacementEntity } from './entities/banner-placement.entity';

@Module({
  imports: [TypeOrmModule.forFeature([BannerEntity, BannerPlacementEntity])],
  controllers: [BannersController],
  providers: [BannersService],
})
export class BannersModule {}
