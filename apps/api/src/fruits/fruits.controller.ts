import { Controller, Get, Post, Patch, Delete, Body, Param, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { FruitsService } from './fruits.service';
import { CreateFruitDto } from './dto/create-fruit.dto';
import { UpdateFruitDto } from './dto/update-fruit.dto';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';

@ApiTags('fruits')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller({ path: 'fruits', version: '1' })
export class FruitsController {
  constructor(private readonly fruitsService: FruitsService) {}

  @Post()
  @ApiOperation({ summary: 'Add fruit to tracker' })
  create(@Body() dto: CreateFruitDto) {
    return this.fruitsService.create(dto);
  }

  @Get('alerts')
  @ApiOperation({ summary: 'Get fruit alerts' })
  getAlerts(@Query('familyId') familyId: string) {
    return this.fruitsService.getAlerts(familyId);
  }

  @Get()
  @ApiOperation({ summary: 'List fruits' })
  findAll(@Query('familyId') familyId: string) {
    return this.fruitsService.findAll(familyId);
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.fruitsService.findOne(id);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() dto: UpdateFruitDto) {
    return this.fruitsService.update(id, dto);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.fruitsService.remove(id);
  }

  @Post(':id/consume')
  @ApiOperation({ summary: 'Record fruit consumption' })
  consume(@Param('id') id: string, @Body('quantity') quantity: number) {
    return this.fruitsService.consume(id, quantity);
  }
}
