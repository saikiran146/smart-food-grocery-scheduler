import { IsString, IsOptional, IsNumber, Min } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateShoppingListDto {
  @ApiProperty({ description: 'Family ID' })
  @IsString()
  familyId: string;

  @ApiProperty({ description: 'Shopping list name' })
  @IsString()
  name: string;

  @ApiPropertyOptional({ description: 'Description' })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional({ description: 'Total budget for the list', minimum: 0 })
  @IsOptional()
  @IsNumber()
  @Min(0)
  totalBudget?: number;
}
