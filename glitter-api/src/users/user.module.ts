import { Module } from '@nestjs/common';
import { UsersController } from './user.controller';
import { UsersService } from './user.service';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuthAccountEntity } from './entities/auth-account.entity';
import { UserEntity } from './entities/user.entity';
import { BranchEntity } from '../branch/entities/branch.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([UserEntity, AuthAccountEntity, BranchEntity]),
  ],
  controllers: [UsersController],
  providers: [UsersService],
  exports: [UsersService],
})
export class UsersModule {}
