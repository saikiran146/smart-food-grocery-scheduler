import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsNotEmpty } from 'class-validator';

export class InviteMemberDto {
  @ApiProperty({ description: 'The invite code for the family' })
  @IsString()
  @IsNotEmpty()
  inviteCode: string;
}
