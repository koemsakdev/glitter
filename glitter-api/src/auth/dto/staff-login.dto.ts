import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsNotEmpty,
  IsObject,
  IsOptional,
  IsString,
  MaxLength,
} from 'class-validator';

export class StaffLoginDto {
  @ApiProperty({
    example: 'dara',
    description: 'Staff username (an email also works for older accounts)',
  })
  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  username!: string;

  @ApiProperty({ example: 'P@ssw0rd123' })
  @IsString()
  @IsNotEmpty()
  password!: string;

  @ApiPropertyOptional({
    description:
      'Device details from the login page (timezone, language, screen…) for the security log',
  })
  @IsOptional()
  @IsObject()
  client?: Record<string, unknown>;
}
