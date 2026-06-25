import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsNotEmpty, IsNumber, IsOptional, IsString } from 'class-validator';

/**
 * Payload from the Telegram Login Widget. The widget signs these fields with
 * the bot token; the backend re-computes the HMAC to verify authenticity.
 */
export class TelegramLoginDto {
  @ApiProperty({ description: 'Telegram user id' })
  @Type(() => Number)
  @IsNumber()
  id!: number;

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  first_name!: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  last_name?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  username?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  photo_url?: string;

  @ApiProperty({ description: 'Unix seconds when the widget signed the data' })
  @Type(() => Number)
  @IsNumber()
  auth_date!: number;

  @ApiProperty({ description: 'HMAC-SHA256 signature from Telegram' })
  @IsString()
  @IsNotEmpty()
  hash!: string;
}
