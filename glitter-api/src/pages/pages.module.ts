import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { PagesController } from './pages.controller';
import { PagesService } from './pages.service';
import { PageEntity } from './entities/page.entity';

@Module({
  imports: [TypeOrmModule.forFeature([PageEntity])],
  controllers: [PagesController],
  providers: [PagesService],
})
export class PagesModule {}
