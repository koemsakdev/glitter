import { Module } from '@nestjs/common';
import { AddressesController } from './address.controller';
import { AddressesCustomerController } from './address-customer.controller';
import { AddressesService } from './address.service';
import { TypeOrmModule } from '@nestjs/typeorm';
import { UserEntity } from 'src/users/entities/user.entity';
import { AddressEntity } from './entities/address.entity';
import { CommonModule } from '../common/common.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([AddressEntity, UserEntity]),
    CommonModule,
  ],
  controllers: [AddressesController, AddressesCustomerController],
  providers: [AddressesService],
  exports: [AddressesService],
})
export class AddressesModule {}
