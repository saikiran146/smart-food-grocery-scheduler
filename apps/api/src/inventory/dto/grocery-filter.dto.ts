import { IsString, IsOptional, IsEnum, IsInt, Min } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { GroceryCategory, StorageLocation } from '@prisma/client';

export class GroceryFilterDto {
  @ApiPropertyOptional({ description: 'Family ID (required for most endpoints)' })
  @IsOptional()
  @IsString()
  familyId?: string;

  @ApiPropertyOptional({ enum: GroceryCategory })
  @IsOptional()
  @IsEnum(GroceryCategory)
  category?: GroceryCategory;

  @ApiPropertyOptional({ enum: StorageLocation })
  @IsOptional()
  @IsEnum(StorageLocation)
  storageLocation?: StorageLocation;

  @ApiPropertyOptional({ description: 'Search term for item name' })
  @IsOptional()
  @IsString()
  search?: string;

  @ApiPropertyOptional({ description: 'Items expiring in the next N days', type: Number })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  expiringInDays?: number;
}
