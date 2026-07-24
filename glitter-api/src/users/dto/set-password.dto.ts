import { ApiProperty } from '@nestjs/swagger';
import { IsString, MaxLength, MinLength } from 'class-validator';

/** Admin sets/resets another user's login password. */
export class SetPasswordDto {
  @ApiProperty({ minLength: 8, maxLength: 128, example: 'Str0ngPass!' })
  @IsString()
  @MinLength(8)
  @MaxLength(128)
  password!: string;
}
