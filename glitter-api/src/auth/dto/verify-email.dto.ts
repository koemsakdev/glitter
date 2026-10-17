import { ApiProperty } from '@nestjs/swagger';
import { IsEmail, IsString, Length, MaxLength } from 'class-validator';

export class VerifyEmailDto {
  @ApiProperty({ example: '123456', description: 'The 6-digit email code' })
  @IsString()
  @Length(4, 8)
  code!: string;
}

export class ResendEmailCodeDto {
  @ApiProperty({ example: 'customer@example.com' })
  @IsEmail()
  @MaxLength(255)
  email!: string;
}

export class ConfirmEmailDto extends ResendEmailCodeDto {
  @ApiProperty({ example: '123456', description: 'The 6-digit email code' })
  @IsString()
  @Length(4, 8)
  code!: string;
}
