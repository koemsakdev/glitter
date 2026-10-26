import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional } from 'class-validator';
import { IsStrongPassword } from '../../common/validators/strong-password';

/**
 * Admin sets/resets another user's login password. Leave it out to reset to
 * the default password. Either way the user must change it on next sign-in.
 */
export class SetPasswordDto {
  @ApiPropertyOptional({ example: 'Str0ngPass!' })
  @IsOptional()
  @IsStrongPassword()
  password?: string;
}
