import { Type } from 'class-transformer';
import {
  ArrayMaxSize,
  IsArray,
  IsIn,
  IsOptional,
  IsString,
  MaxLength,
  MinLength,
  ValidateNested,
} from 'class-validator';

/** One turn in the chat transcript sent from the storefront. */
export class ChatMessageDto {
  @IsIn(['user', 'model'])
  role!: 'user' | 'model';

  @IsString()
  @MinLength(1)
  @MaxLength(2000)
  content!: string;
}

export class ChatDto {
  @IsArray()
  @ArrayMaxSize(40)
  @ValidateNested({ each: true })
  @Type(() => ChatMessageDto)
  messages!: ChatMessageDto[];

  @IsOptional()
  @IsIn(['en', 'km'])
  language?: 'en' | 'km';
}
