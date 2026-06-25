import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { BadgesController } from './badges.controller';
import { BadgesService } from './badges.service';
import { BadgeEntity } from './entities/badge.entity';
import { ProductBadgeEntity } from '../product-badges/entities/product-badge.entity';

@Module({
  imports: [TypeOrmModule.forFeature([BadgeEntity, ProductBadgeEntity])],
  controllers: [BadgesController],
  providers: [BadgesService],
})
export class BadgesModule {}
