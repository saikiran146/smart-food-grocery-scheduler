import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsNotEmpty } from 'class-validator';

export class RefreshTokenDto {
  @ApiProperty({ description: 'The refresh token issued at login or register' })
  @IsString()
  @IsNotEmpty()
  refreshToken: string;
}
