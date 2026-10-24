import {
  IsEmail,
  IsEnum,
  IsLatitude,
  IsLongitude,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  MaxLength,
  MinLength,
} from 'class-validator';
import type { BranchStatus } from '../entities/branch.entity';
import { ApiProperty } from '@nestjs/swagger';

export class CreateBranchDto {
  /** Generated from the city when left out (e.g. GS-PP-001). */
  @ApiProperty({ example: 'GS-PP-001', required: false })
  @IsOptional()
  @IsString()
  @MinLength(2)
  @MaxLength(20)
  branchCode?: string;

  @ApiProperty({ example: 'Glitter Shop Toul Tom Pong' })
  @IsString()
  @IsNotEmpty()
  @MinLength(3)
  @MaxLength(100)
  branchNameEn!: string;

  @ApiProperty({ example: 'ហ្គ្លីតធើសប ​ទួលទំពូង ភ្នំពេញ' })
  @IsString()
  @IsNotEmpty()
  @MinLength(3)
  @MaxLength(100)
  branchNameKm!: string;

  @ApiProperty({ example: 'ផ្ទះ 79 ផ្លូវ 432 កែង 163, ទួលទំពូង ភ្នំពេញ' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  streetAddress!: string;

  @ApiProperty({ example: 'Phnom Penh' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  city!: string;

  @ApiProperty({ example: '+85515711783' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(20)
  phoneNumber!: string;

  @ApiProperty({ example: 'glittershopbyka@gmail.com', required: false })
  @IsOptional()
  @IsEmail()
  email?: string | null;

  @ApiProperty({ example: 11.5419 })
  @IsLatitude()
  @IsNumber()
  @IsNotEmpty()
  latitude!: number;

  @ApiProperty({ example: 104.9132 })
  @IsLongitude()
  @IsNumber()
  @IsNotEmpty()
  longitude!: number;

  @ApiProperty({ example: 'Mon-Sun: 9AM-8PM' })
  @IsString()
  @IsOptional()
  openingHours?: string | null;

  @ApiProperty({ example: 'active' })
  @IsEnum(['active', 'inactive', 'closed'])
  @IsOptional()
  branchStatus?: BranchStatus;
}
