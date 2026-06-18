import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsBoolean,
  IsEnum,
  IsLatitude,
  IsLongitude,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUUID,
  Matches,
  MaxLength,
} from 'class-validator';
import type { AddressType } from '../entities/address.entity';

export class CreateAddressDto {
  @ApiProperty({
    description: 'Owner user UUID',
    example: '550e8400-e29b-41d4-a716-446655440000',
  })
  @IsUUID()
  userId!: string;

  @ApiPropertyOptional({
    example: 'Home',
    description: 'Short label to help the user identify this address',
  })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  label?: string;

  @ApiProperty({ example: 'Koemsak Sovann' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  recipientName!: string;

  @ApiProperty({
    example: '+85512345678',
    description: 'Delivery contact phone number (Cambodian format)',
  })
  @IsString()
  @Matches(/^(\+?855|0)\d{7,10}$/, {
    message:
      'recipientPhone must be a valid Cambodian number (e.g., +85512345678 or 012345678)',
  })
  recipientPhone!: string;

  @ApiPropertyOptional({ example: 'Phnom Penh' })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  province?: string;

  @ApiPropertyOptional({ example: 'Chamkar Mon' })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  district?: string;

  @ApiPropertyOptional({ example: 'Tuol Tompoung 1' })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  commune?: string;

  @ApiPropertyOptional({ example: 'Village 5' })
  @IsOptional()
  @IsString()
  @MaxLength(255)
  village?: string;

  @ApiProperty({ example: 'House #42, Street 271' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(500)
  streetAddress!: string;

  @ApiPropertyOptional({ example: '12302' })
  @IsOptional()
  @IsString()
  @MaxLength(10)
  postalCode?: string;

  @ApiPropertyOptional({
    example: 'Blue gate next to Angkor Market',
  })
  @IsOptional()
  @IsString()
  landmark?: string;

  @ApiPropertyOptional({
    enum: ['shipping', 'billing', 'both'],
    default: 'both',
  })
  @IsOptional()
  @IsEnum(['shipping', 'billing', 'both'])
  addressType?: AddressType;

  @ApiPropertyOptional({
    description:
      "Mark as user's default shipping address. If another is currently default, it will be unset.",
    default: false,
  })
  @IsOptional()
  @IsBoolean()
  isDefaultShipping?: boolean;

  @ApiPropertyOptional({ default: false })
  @IsOptional()
  @IsBoolean()
  isDefaultBilling?: boolean;

  @ApiPropertyOptional({
    example: 11.5563738,
    description: 'GPS latitude (optional, for map display)',
  })
  @IsOptional()
  @Type(() => Number)
  @IsLatitude()
  latitude?: number;

  @ApiPropertyOptional({
    example: 104.9282099,
    description: 'GPS longitude (optional, for map display)',
  })
  @IsOptional()
  @Type(() => Number)
  @IsLongitude()
  longitude?: number;
}
