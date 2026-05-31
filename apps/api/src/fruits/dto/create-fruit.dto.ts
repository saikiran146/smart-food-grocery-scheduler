import { IsString, IsInt, IsEnum, IsOptional, IsNumber, IsDateString, Min } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { RipnessLevel } from '@prisma/client';

export class CreateFruitDto {
  @ApiProperty() @IsString() familyId: string;
  @ApiProperty() @IsString() name: string;
  @ApiProperty() @IsInt() @Min(1) quantity: number;
  @ApiPropertyOptional() @IsOptional() @IsDateString() purchaseDate?: string;
  @ApiPropertyOptional({ enum: RipnessLevel }) @IsOptional() @IsEnum(RipnessLevel) ripnessLevel?: RipnessLevel;
  @ApiPropertyOptional() @IsOptional() @IsInt() @Min(1) expectedRipeDays?: number;
  @ApiPropertyOptional() @IsOptional() @IsNumber() @Min(0) costPerPiece?: number;
  @ApiPropertyOptional() @IsOptional() @IsString() notes?: string;
}
