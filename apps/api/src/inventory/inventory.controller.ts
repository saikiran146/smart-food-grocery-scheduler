import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiBearerAuth,
  ApiQuery,
  ApiBody,
} from '@nestjs/swagger';
import { InventoryService } from './inventory.service';
import { CreateGroceryDto } from './dto/create-grocery.dto';
import { UpdateGroceryDto } from './dto/update-grocery.dto';
import { GroceryFilterDto } from './dto/grocery-filter.dto';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { GroceryCategory, StorageLocation } from '@prisma/client';
import { IsNumber, IsOptional, IsString } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

class AdjustQuantityDto {
  @ApiPropertyOptional({ description: 'Quantity delta (positive = add, negative = remove)' })
  quantity: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  notes?: string;
}

@ApiTags('Inventory')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('inventory')
export class InventoryController {
  constructor(private readonly inventoryService: InventoryService) {}

  @Post()
  @ApiOperation({ summary: 'Add a grocery item to inventory' })
  create(@Body() dto: CreateGroceryDto) {
    return this.inventoryService.create(dto);
  }

  @Get('expiring')
  @ApiOperation({ summary: 'Get items expiring in the next N days' })
  @ApiQuery({ name: 'familyId', required: true })
  @ApiQuery({ name: 'days', required: false, type: Number })
  getExpiring(@Query('familyId') familyId: string, @Query('days') days?: string) {
    return this.inventoryService.getExpiring(familyId, days ? Number(days) : 7);
  }

  @Get('low-stock')
  @ApiOperation({ summary: 'Get items that are low in stock' })
  @ApiQuery({ name: 'familyId', required: true })
  getLowStock(@Query('familyId') familyId: string) {
    return this.inventoryService.getLowStock(familyId);
  }

  @Get('shortages')
  @ApiOperation({ summary: 'Compare meal plan ingredients vs inventory for next N days' })
  @ApiQuery({ name: 'familyId', required: true })
  @ApiQuery({ name: 'days', required: false, type: Number })
  getShortages(@Query('familyId') familyId: string, @Query('days') days?: string) {
    return this.inventoryService.getShortages(familyId, days ? Number(days) : 7);
  }

  @Get()
  @ApiOperation({ summary: 'List grocery items with filters' })
  @ApiQuery({ name: 'familyId', required: true })
  @ApiQuery({ name: 'category', required: false, enum: GroceryCategory })
  @ApiQuery({ name: 'storageLocation', required: false, enum: StorageLocation })
  @ApiQuery({ name: 'search', required: false })
  @ApiQuery({ name: 'expiringInDays', required: false, type: Number })
  findAll(@Query() filters: GroceryFilterDto) {
    return this.inventoryService.findAll(filters);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a grocery item with its transaction history' })
  findOne(@Param('id') id: string) {
    return this.inventoryService.findOne(id);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update a grocery item' })
  update(@Param('id') id: string, @Body() dto: UpdateGroceryDto) {
    return this.inventoryService.update(id, dto);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Soft delete a grocery item (set isActive=false)' })
  @HttpCode(HttpStatus.OK)
  softDelete(@Param('id') id: string) {
    return this.inventoryService.softDelete(id);
  }

  @Post(':id/adjust')
  @ApiOperation({ summary: 'Manually adjust inventory quantity (creates ADJUSTMENT transaction)' })
  @ApiBody({ type: AdjustQuantityDto })
  adjust(
    @Param('id') id: string,
    @Body('quantity') quantity: number,
    @Body('notes') notes?: string,
  ) {
    return this.inventoryService.adjust(id, quantity, notes);
  }
}
