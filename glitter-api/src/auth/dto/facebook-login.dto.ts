import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString } from 'class-validator';

/**
 * For the client-side Facebook Login (JS SDK) flow. The browser gets a user
 * access token from FB.login(), then sends it here. The backend verifies the
 * token belongs to our app and fetches the profile from the Graph API.
 */
export class FacebookLoginDto {
  @ApiProperty({
    description: 'User access token from the Facebook JS SDK',
    example: 'EAAB...',
  })
  @IsString()
  @IsNotEmpty()
  accessToken!: string;
}
