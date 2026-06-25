import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AdvertisementsController } from './advertisements.controller';
import { AdvertisementsService } from './advertisements.service';
import { AdvertisementEntity } from './entities/advertisement.entity';
import { AdPlacementEntity } from './entities/ad-placement.entity';

@Module({
  imports: [TypeOrmModule.forFeature([AdvertisementEntity, AdPlacementEntity])],
  controllers: [AdvertisementsController],
  providers: [AdvertisementsService],
})
export class AdvertisementsModule {}
