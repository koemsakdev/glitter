import { ApiProperty } from '@nestjs/swagger';
import { IsStrongPassword } from '../../common/validators/strong-password';

/** Admin sets/resets another user's login password. */
export class SetPasswordDto {
  @ApiProperty({ minLength: 8, maxLength: 128, example: 'Str0ngPass!' })
  @IsStrongPassword()
  password!: string;
}
