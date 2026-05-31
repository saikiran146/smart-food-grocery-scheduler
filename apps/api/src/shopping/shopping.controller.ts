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
} from '@nestjs/swagger';
import { ShoppingService } from './shopping.service';
import { CreateShoppingListDto } from './dto/create-shopping-list.dto';
import { AddItemDto, UpdateShoppingItemDto } from './dto/add-item.dto';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';

@ApiTags('Shopping')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('shopping')
export class ShoppingController {
  constructor(private readonly shoppingService: ShoppingService) {}

  @Post('generate')
  @ApiOperation({ summary: 'Auto-generate shopping list from meal plan shortages' })
  @ApiQuery({ name: 'familyId', required: true })
  @ApiQuery({ name: 'days', required: false, type: Number })
  generate(
    @CurrentUser('id') userId: string,
    @Query('familyId') familyId: string,
    @Query('days') days?: string,
  ) {
    return this.shoppingService.generateFromShortages(userId, familyId, days ? Number(days) : 7);
  }

  @Post()
  @ApiOperation({ summary: 'Create a shopping list' })
  create(@CurrentUser('id') userId: string, @Body() dto: CreateShoppingListDto) {
    return this.shoppingService.create(userId, dto);
  }

  @Get()
  @ApiOperation({ summary: 'List all shopping lists for a family' })
  @ApiQuery({ name: 'familyId', required: true })
  findAll(@Query('familyId') familyId: string) {
    return this.shoppingService.findAll(familyId);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a shopping list with all its items' })
  findOne(@Param('id') id: string) {
    return this.shoppingService.findOne(id);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update a shopping list' })
  update(
    @Param('id') id: string,
    @Body() body: { name?: string; description?: string; totalBudget?: number },
  ) {
    return this.shoppingService.update(id, body);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete a shopping list' })
  @HttpCode(HttpStatus.OK)
  remove(@Param('id') id: string) {
    return this.shoppingService.remove(id);
  }

  @Post(':id/items')
  @ApiOperation({ summary: 'Add an item to a shopping list' })
  addItem(@Param('id') id: string, @Body() dto: AddItemDto) {
    return this.shoppingService.addItem(id, dto);
  }

  @Patch(':id/items/:itemId')
  @ApiOperation({ summary: 'Update a shopping list item (mark purchased, change qty, etc.)' })
  updateItem(
    @Param('id') id: string,
    @Param('itemId') itemId: string,
    @Body() dto: UpdateShoppingItemDto,
  ) {
    return this.shoppingService.updateItem(id, itemId, dto);
  }

  @Delete(':id/items/:itemId')
  @ApiOperation({ summary: 'Remove an item from a shopping list' })
  @HttpCode(HttpStatus.OK)
  removeItem(@Param('id') id: string, @Param('itemId') itemId: string) {
    return this.shoppingService.removeItem(id, itemId);
  }

  @Post(':id/complete')
  @ApiOperation({ summary: 'Complete the shopping list and add purchased items to inventory' })
  complete(@Param('id') id: string) {
    return this.shoppingService.complete(id);
  }
}
