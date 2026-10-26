import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsNotEmpty, IsOptional, IsString } from 'class-validator';
import { IsStrongPassword } from '../../common/validators/strong-password';

export class ChangePasswordDto {
  @ApiPropertyOptional({
    example: 'OldP@ssw0rd',
    description:
      'Required, except on the forced first-sign-in change (the user just ' +
      'signed in with the temporary password).',
  })
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  currentPassword?: string;

  @ApiProperty({
    example: 'NewP@ssw0rd123',
    minLength: 8,
    maxLength: 128,
  })
  @IsStrongPassword()
  newPassword!: string;
}
