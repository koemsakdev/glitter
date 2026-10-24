import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString } from 'class-validator';
import { IsStrongPassword } from '../../common/validators/strong-password';

export class ChangePasswordDto {
  @ApiProperty({ example: 'OldP@ssw0rd' })
  @IsString()
  @IsNotEmpty()
  currentPassword!: string;

  @ApiProperty({
    example: 'NewP@ssw0rd123',
    minLength: 8,
    maxLength: 128,
  })
  @IsStrongPassword()
  newPassword!: string;
}
