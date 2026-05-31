import { IsInt, IsEnum, IsOptional, Min } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { RipnessLevel } from '@prisma/client';

export class UpdateFruitDto {
  @ApiPropertyOptional() @IsOptional() @IsInt() @Min(0) remainingQty?: number;
  @ApiPropertyOptional({ enum: RipnessLevel }) @IsOptional() @IsEnum(RipnessLevel) ripnessLevel?: RipnessLevel;
  @ApiPropertyOptional() @IsOptional() @IsInt() @Min(1) expectedRipeDays?: number;
}
