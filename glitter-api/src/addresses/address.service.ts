import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';
import { UserEntity } from '../users/entities/user.entity';
import { AddressQueryDto } from './dto/address-query.dto';
import { CreateAddressDto } from './dto/create-address.dto';
import { UpdateAddressDto } from './dto/update-address.dto';
import { AddressEntity } from './entities/address.entity';
import {
  AddressDetailResponse,
  AddressListResponse,
  AddressResponse,
} from './types/address-response.type';

@Injectable()
export class AddressesService {
  constructor(
    @InjectRepository(AddressEntity)
    private readonly addressRepository: Repository<AddressEntity>,
    @InjectRepository(UserEntity)
    private readonly userRepository: Repository<UserEntity>,
    private readonly dataSource: DataSource,
  ) {}

  async create(dto: CreateAddressDto): Promise<AddressDetailResponse> {
    const user = await this.userRepository.findOne({
      where: { id: dto.userId },
    });
    if (user === null) {
      throw new BadRequestException(`User with ID ${dto.userId} not found`);
    }

    // Transaction: if marking as default, unset others first
    return this.dataSource.transaction(async (manager) => {
      const repo = manager.getRepository(AddressEntity);

      if (dto.isDefaultShipping === true) {
        await this.unsetOtherDefaults(repo, dto.userId, 'shipping');
      }
      if (dto.isDefaultBilling === true) {
        await this.unsetOtherDefaults(repo, dto.userId, 'billing');
      }

      const entity = repo.create({
        userId: dto.userId,
        label: dto.label ?? null,
        recipientName: dto.recipientName,
        recipientPhone: dto.recipientPhone,
        province: dto.province,
        district: dto.district,
        commune: dto.commune ?? null,
        village: dto.village ?? null,
        streetAddress: dto.streetAddress,
        postalCode: dto.postalCode ?? null,
        landmark: dto.landmark ?? null,
        addressType: dto.addressType ?? 'both',
        isDefaultShipping: dto.isDefaultShipping ?? false,
        isDefaultBilling: dto.isDefaultBilling ?? false,
        latitude: dto.latitude !== undefined ? String(dto.latitude) : null,
        longitude: dto.longitude !== undefined ? String(dto.longitude) : null,
        imageUrl: dto.imageUrl ?? null,
        imageUrls: dto.imageUrls ?? [],
      });

      const saved = await repo.save(entity);
      return { data: this.toResponse(saved) };
    });
  }

  /**
   * List addresses. Usually filtered by userId for "my addresses".
   * Admin dashboard can list without userId filter to see all addresses.
   */
  async findAll(query: AddressQueryDto): Promise<AddressListResponse> {
    const qb = this.addressRepository.createQueryBuilder('address');

    if (query.userId) {
      qb.andWhere('address.userId = :userId', { userId: query.userId });
    }

    if (query.province) {
      qb.andWhere('address.province = :province', { province: query.province });
    }

    if (query.addressType) {
      qb.andWhere('address.addressType = :addressType', {
        addressType: query.addressType,
      });
    }

    if (query.onlyDefaultShipping === true) {
      qb.andWhere('address.isDefaultShipping = true');
    }

    if (query.onlyDefaultBilling === true) {
      qb.andWhere('address.isDefaultBilling = true');
    }

    // Defaults first, then newest
    qb.orderBy('address.isDefaultShipping', 'DESC')
      .addOrderBy('address.isDefaultBilling', 'DESC')
      .addOrderBy('address.createdAt', 'DESC');

    const [addresses, total] = await qb.getManyAndCount();

    return {
      data: addresses.map((a: AddressEntity) => this.toResponse(a)),
      total: Number(total),
    };
  }

  async findOne(id: string): Promise<AddressDetailResponse> {
    const address = await this.addressRepository.findOne({ where: { id } });

    if (address === null) {
      throw new NotFoundException(`Address with ID ${id} not found`);
    }

    return { data: this.toResponse(address) };
  }

  /**
   * Get a user's default shipping address.
   * Used by checkout to pre-fill the shipping form.
   */
  async findDefaultShipping(
    userId: string,
  ): Promise<AddressDetailResponse | null> {
    const address = await this.addressRepository.findOne({
      where: { userId, isDefaultShipping: true },
    });

    if (address === null) {
      return null;
    }

    return { data: this.toResponse(address) };
  }

  async findDefaultBilling(
    userId: string,
  ): Promise<AddressDetailResponse | null> {
    const address = await this.addressRepository.findOne({
      where: { userId, isDefaultBilling: true },
    });

    if (address === null) {
      return null;
    }

    return { data: this.toResponse(address) };
  }

  async update(
    id: string,
    dto: UpdateAddressDto,
  ): Promise<AddressDetailResponse> {
    const address = await this.addressRepository.findOne({ where: { id } });

    if (address === null) {
      throw new NotFoundException(`Address with ID ${id} not found`);
    }

    return this.dataSource.transaction(async (manager) => {
      const repo = manager.getRepository(AddressEntity);

      // If turning on default, unset others first (only if changing FROM false TO true)
      if (
        dto.isDefaultShipping === true &&
        address.isDefaultShipping === false
      ) {
        await this.unsetOtherDefaults(repo, address.userId, 'shipping');
      }
      if (dto.isDefaultBilling === true && address.isDefaultBilling === false) {
        await this.unsetOtherDefaults(repo, address.userId, 'billing');
      }

      if (dto.label !== undefined) address.label = dto.label;
      if (dto.recipientName !== undefined)
        address.recipientName = dto.recipientName;
      if (dto.recipientPhone !== undefined)
        address.recipientPhone = dto.recipientPhone;
      if (dto.province !== undefined) address.province = dto.province;
      if (dto.district !== undefined) address.district = dto.district;
      if (dto.commune !== undefined) address.commune = dto.commune;
      if (dto.village !== undefined) address.village = dto.village;
      if (dto.streetAddress !== undefined)
        address.streetAddress = dto.streetAddress;
      if (dto.postalCode !== undefined) address.postalCode = dto.postalCode;
      if (dto.landmark !== undefined) address.landmark = dto.landmark;
      if (dto.addressType !== undefined) address.addressType = dto.addressType;
      if (dto.isDefaultShipping !== undefined)
        address.isDefaultShipping = dto.isDefaultShipping;
      if (dto.isDefaultBilling !== undefined)
        address.isDefaultBilling = dto.isDefaultBilling;
      if (dto.latitude !== undefined) address.latitude = String(dto.latitude);
      if (dto.longitude !== undefined)
        address.longitude = String(dto.longitude);
      if (dto.imageUrl !== undefined) address.imageUrl = dto.imageUrl;
      if (dto.imageUrls !== undefined) address.imageUrls = dto.imageUrls;

      const updated = await repo.save(address);
      return { data: this.toResponse(updated) };
    });
  }

  /**
   * Convenience endpoint: set an address as default shipping.
   * Unsets any other address's default flag in the same transaction.
   */
  async setAsDefaultShipping(id: string): Promise<AddressDetailResponse> {
    const address = await this.addressRepository.findOne({ where: { id } });

    if (address === null) {
      throw new NotFoundException(`Address with ID ${id} not found`);
    }

    if (address.addressType === 'billing') {
      throw new BadRequestException(
        'Cannot set a billing-only address as default shipping. Change addressType first.',
      );
    }

    return this.dataSource.transaction(async (manager) => {
      const repo = manager.getRepository(AddressEntity);
      await this.unsetOtherDefaults(repo, address.userId, 'shipping');
      address.isDefaultShipping = true;
      const saved = await repo.save(address);
      return { data: this.toResponse(saved) };
    });
  }

  async setAsDefaultBilling(id: string): Promise<AddressDetailResponse> {
    const address = await this.addressRepository.findOne({ where: { id } });

    if (address === null) {
      throw new NotFoundException(`Address with ID ${id} not found`);
    }

    if (address.addressType === 'shipping') {
      throw new BadRequestException(
        'Cannot set a shipping-only address as default billing. Change addressType first.',
      );
    }

    return this.dataSource.transaction(async (manager) => {
      const repo = manager.getRepository(AddressEntity);
      await this.unsetOtherDefaults(repo, address.userId, 'billing');
      address.isDefaultBilling = true;
      const saved = await repo.save(address);
      return { data: this.toResponse(saved) };
    });
  }

  async delete(id: string): Promise<void> {
    const address = await this.addressRepository.findOne({ where: { id } });

    if (address === null) {
      throw new NotFoundException(`Address with ID ${id} not found`);
    }

    await this.addressRepository.remove(address);
  }

  // ==========================================================================
  // HELPERS
  // ==========================================================================

  /**
   * Ensure only ONE address per user is marked as the default for a given type.
   * Called before setting a new default so we don't end up with two.
   */
  private async unsetOtherDefaults(
    repo: Repository<AddressEntity>,
    userId: string,
    type: 'shipping' | 'billing',
  ): Promise<void> {
    if (type === 'shipping') {
      await repo.update(
        { userId, isDefaultShipping: true },
        { isDefaultShipping: false },
      );
    } else {
      await repo.update(
        { userId, isDefaultBilling: true },
        { isDefaultBilling: false },
      );
    }
  }

  private formatAddress(address: AddressEntity): string {
    const parts = [
      address.streetAddress,
      address.village,
      address.commune,
      address.district,
      address.province,
      address.postalCode,
    ].filter((p): p is string => Boolean(p));
    return parts.join(', ');
  }

  private toResponse(entity: AddressEntity): AddressResponse {
    return {
      id: entity.id,
      userId: entity.userId,
      label: entity.label,
      recipientName: entity.recipientName,
      recipientPhone: entity.recipientPhone,
      province: entity.province,
      district: entity.district,
      commune: entity.commune,
      village: entity.village,
      streetAddress: entity.streetAddress,
      postalCode: entity.postalCode,
      landmark: entity.landmark,
      addressType: entity.addressType,
      isDefaultShipping: entity.isDefaultShipping,
      isDefaultBilling: entity.isDefaultBilling,
      latitude: entity.latitude,
      longitude: entity.longitude,
      imageUrl: entity.imageUrl,
      imageUrls: entity.imageUrls ?? [],
      formattedAddress: this.formatAddress(entity),
      createdAt: entity.createdAt,
      updatedAt: entity.updatedAt,
    };
  }
}
