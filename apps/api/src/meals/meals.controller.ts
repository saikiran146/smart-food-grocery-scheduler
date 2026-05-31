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
import { MealsService } from './meals.service';
import { CreateMealDto } from './dto/create-meal.dto';
import { UpdateMealDto } from './dto/update-meal.dto';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { MealStatus } from '@prisma/client';

@ApiTags('Meals')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('meals')
export class MealsController {
  constructor(private readonly mealsService: MealsService) {}

  @Post()
  @ApiOperation({ summary: 'Schedule a meal' })
  create(@CurrentUser('id') userId: string, @Body() dto: CreateMealDto) {
    return this.mealsService.create(userId, dto);
  }

  @Get('calendar')
  @ApiOperation({ summary: 'Get meals as calendar events for a month' })
  @ApiQuery({ name: 'familyId', required: true })
  @ApiQuery({ name: 'year', required: true, type: Number })
  @ApiQuery({ name: 'month', required: true, type: Number })
  getCalendar(
    @Query('familyId') familyId: string,
    @Query('year') year: string,
    @Query('month') month: string,
  ) {
    return this.mealsService.getCalendar(familyId, Number(year), Number(month));
  }

  @Get()
  @ApiOperation({ summary: 'List meals with optional filters' })
  @ApiQuery({ name: 'familyId', required: true })
  @ApiQuery({ name: 'startDate', required: false })
  @ApiQuery({ name: 'endDate', required: false })
  @ApiQuery({ name: 'status', required: false, enum: MealStatus })
  @ApiQuery({ name: 'mealType', required: false })
  findAll(
    @Query('familyId') familyId: string,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
    @Query('status') status?: MealStatus,
    @Query('mealType') mealType?: string,
  ) {
    return this.mealsService.findAll({ familyId, startDate, endDate, status, mealType });
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a single meal by ID' })
  findOne(@Param('id') id: string) {
    return this.mealsService.findOne(id);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update a meal' })
  update(@Param('id') id: string, @Body() dto: UpdateMealDto) {
    return this.mealsService.update(id, dto);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete a meal' })
  @HttpCode(HttpStatus.OK)
  remove(@Param('id') id: string) {
    return this.mealsService.remove(id);
  }

  @Post(':id/complete')
  @ApiOperation({ summary: 'Mark meal as completed and deduct ingredients from inventory' })
  complete(@Param('id') id: string) {
    return this.mealsService.complete(id);
  }

  @Post(':id/skip')
  @ApiOperation({ summary: 'Mark meal as skipped' })
  skip(@Param('id') id: string) {
    return this.mealsService.skip(id);
  }
}
