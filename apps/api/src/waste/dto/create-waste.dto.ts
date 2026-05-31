import { IsString, IsEnum, IsNumber, IsOptional, IsDateString, Min } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { GroceryCategory, WasteCategory, Unit } from '@prisma/client';

export class CreateWasteDto {
  @ApiProperty() @IsString() itemName: string;
  @ApiProperty({ enum: GroceryCategory }) @IsEnum(GroceryCategory) category: GroceryCategory;
  @ApiProperty({ enum: WasteCategory }) @IsEnum(WasteCategory) wasteCategory: WasteCategory;
  @ApiProperty() @IsNumber() @Min(0) quantity: number;
  @ApiProperty({ enum: Unit }) @IsEnum(Unit) unit: Unit;
  @ApiPropertyOptional() @IsOptional() @IsNumber() @Min(0) costWasted?: number;
  @ApiPropertyOptional() @IsOptional() @IsString() reason?: string;
  @ApiPropertyOptional() @IsOptional() @IsDateString() wastedAt?: string;
  @ApiProperty() @IsString() familyId: string;
}
