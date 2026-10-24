import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsEmail,
  IsNotEmpty,
  IsOptional,
  IsString,
  Matches,
  MaxLength,
} from 'class-validator';
import { IsStrongPassword } from '../../common/validators/strong-password';

export class RegisterDto {
  @ApiProperty({ example: 'customer@example.com' })
  @IsEmail()
  @MaxLength(255)
  email!: string;

  @ApiProperty({
    example: 'P@ssw0rd123',
    minLength: 8,
    maxLength: 128,
    description:
      'At least 8 characters, with upper- and lowercase letters and a number',
  })
  @IsStrongPassword()
  password!: string;

  @ApiProperty({ example: 'Koem Sovann' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  fullName!: string;

  @ApiPropertyOptional({
    example: '+85512345678',
    description: 'Optional at signup, required before ordering',
  })
  @IsOptional()
  @IsString()
  @Matches(/^(\+?855|0)\d{7,10}$/, {
    message:
      'phoneNumber must be a valid Cambodian number (e.g., +85512345678 or 012345678)',
  })
  phoneNumber?: string;
}
