import { ApiProperty } from '@nestjs/swagger';
import { ArrayUnique, IsArray, IsIn } from 'class-validator';
import { PERMISSIONS, type Permission } from '../../auth/permissions';

export class SetPermissionsDto {
  @ApiProperty({
    example: ['products.edit', 'promotions.manage'],
    enum: PERMISSIONS,
    isArray: true,
  })
  @IsArray()
  @ArrayUnique()
  @IsIn(PERMISSIONS as unknown as string[], { each: true })
  permissions!: Permission[];
}
