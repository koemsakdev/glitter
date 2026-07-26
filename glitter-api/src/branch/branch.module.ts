import { Module } from '@nestjs/common';
import { BranchesService } from './branch.service';
import { BranchesController } from './branch.controller';
import { BranchEntity } from './entities/branch.entity';
import { TypeOrmModule } from '@nestjs/typeorm';

@Module({
  imports: [TypeOrmModule.forFeature([BranchEntity])],
  controllers: [BranchesController],
  providers: [BranchesService],
  exports: [BranchesService],
})
export class BranchModule {}
