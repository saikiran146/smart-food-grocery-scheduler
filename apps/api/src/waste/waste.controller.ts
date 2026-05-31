import { Controller, Get, Post, Delete, Body, Param, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { WasteService } from './waste.service';
import { CreateWasteDto } from './dto/create-waste.dto';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';

@ApiTags('waste')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller({ path: 'waste', version: '1' })
export class WasteController {
  constructor(private readonly wasteService: WasteService) {}

  @Post()
  @ApiOperation({ summary: 'Log food waste' })
  create(@CurrentUser('id') userId: string, @Body() dto: CreateWasteDto) {
    return this.wasteService.create(userId, dto);
  }

  @Get()
  @ApiOperation({ summary: 'List waste logs' })
  findAll(
    @Query('familyId') familyId: string,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
    @Query('wasteCategory') wasteCategory?: string,
  ) {
    return this.wasteService.findAll(familyId, { startDate, endDate, wasteCategory });
  }

  @Get('summary')
  @ApiOperation({ summary: 'Monthly waste summary' })
  getSummary(
    @Query('familyId') familyId: string,
    @Query('month') month?: number,
    @Query('year') year?: number,
  ) {
    return this.wasteService.getSummary(familyId, month, year);
  }

  @Get(':id')
  findOne(@Param('id') id: string, @CurrentUser('id') userId: string) {
    return this.wasteService.findOne(id, userId);
  }

  @Delete(':id')
  remove(@Param('id') id: string, @CurrentUser('id') userId: string) {
    return this.wasteService.remove(id, userId);
  }
}
