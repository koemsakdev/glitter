import {
  IsBoolean,
  IsOptional,
  IsString,
  MaxLength,
} from 'class-validator';

export class UpdatePaymentConfigDto {
  @IsOptional()
  @IsBoolean()
  enabled?: boolean;

  @IsOptional()
  @IsBoolean()
  sandbox?: boolean;

  @IsOptional()
  @IsString()
  @MaxLength(60)
  merchantId?: string;

  @IsOptional()
  @IsString()
  apiKey?: string;

  @IsOptional()
  @IsString()
  rsaPublicKey?: string;

  @IsOptional()
  @IsString()
  rsaPrivateKey?: string;

  @IsOptional()
  @IsString()
  webhookUrl?: string;
}
