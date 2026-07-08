import { IsOptional, IsString, IsUUID } from 'class-validator';

export class CreateKhqrDto {
  @IsUUID()
  orderId!: string;
}

/** PayWay pushback payload (loose — we re-verify via check-transaction). */
export class AbaWebhookDto {
  @IsOptional()
  @IsString()
  tran_id?: string;

  @IsOptional()
  @IsString()
  return_params?: string;

  @IsOptional()
  @IsString()
  merchant_ref?: string;

  @IsOptional()
  @IsString()
  transaction_id?: string;
}
