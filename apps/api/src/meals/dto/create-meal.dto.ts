import {
  IsString,
  IsOptional,
  IsEnum,
  IsDateString,
  IsInt,
  IsPositive,
  Min,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { MealType } from '@prisma/client';

export class CreateMealDto {
  @ApiProperty({ description: 'Family ID' })
  @IsString()
  familyId: string;

  @ApiPropertyOptional({ description: 'Recipe ID (if using a recipe)' })
  @IsOptional()
  @IsString()
  recipeId?: string;

  @ApiPropertyOptional({ description: 'Custom meal name (if no recipe)' })
  @IsOptional()
  @IsString()
  customMealName?: string;

  @ApiProperty({ enum: MealType, description: 'Type of meal' })
  @IsEnum(MealType)
  mealType: MealType;

  @ApiProperty({ description: 'Scheduled date/time (ISO string)' })
  @IsDateString()
  scheduledAt: string;

  @ApiProperty({ description: 'Number of servings', minimum: 1 })
  @IsInt()
  @IsPositive()
  @Min(1)
  servings: number;

  @ApiPropertyOptional({ description: 'Additional notes' })
  @IsOptional()
  @IsString()
  notes?: string;
}
