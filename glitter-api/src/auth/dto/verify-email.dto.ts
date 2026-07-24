import { ApiProperty } from '@nestjs/swagger';
import { IsString, Length } from 'class-validator';

export class VerifyEmailDto {
  @ApiProperty({ example: '123456', description: 'The 6-digit email code' })
  @IsString()
  @Length(4, 8)
  code!: string;
}
