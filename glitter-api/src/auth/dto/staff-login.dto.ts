import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString, MaxLength } from 'class-validator';

export class StaffLoginDto {
  @ApiProperty({
    example: 'dara',
    description: 'Staff username (an email also works for older accounts)',
  })
  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  username!: string;

  @ApiProperty({ example: 'P@ssw0rd123' })
  @IsString()
  @IsNotEmpty()
  password!: string;
}
