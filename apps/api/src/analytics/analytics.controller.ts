import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { AnalyticsService } from './analytics.service';

@Controller('analytics')
@UseGuards(JwtAuthGuard)
export class AnalyticsController {
  constructor(private readonly analyticsService: AnalyticsService) {}

  @Get('dashboard')
  async getDashboard(
    @Query('familyId') familyId: string,
    @Query('month') month?: string,
    @Query('year') year?: string,
  ) {
    const now = new Date();
    const targetMonth = month ? parseInt(month, 10) : now.getMonth() + 1;
    const targetYear = year ? parseInt(year, 10) : now.getFullYear();

    return this.analyticsService.getDashboard(familyId, targetMonth, targetYear);
  }

  @Get('inventory')
  async getInventoryMetrics(
    @Query('familyId') familyId: string,
  ) {
    return this.analyticsService.getInventoryMetrics(familyId);
  }

  @Get('consumption')
  async getConsumptionMetrics(
    @Query('familyId') familyId: string,
    @Query('month') month?: string,
    @Query('year') year?: string,
  ) {
    const now = new Date();
    const targetMonth = month ? parseInt(month, 10) : now.getMonth() + 1;
    const targetYear = year ? parseInt(year, 10) : now.getFullYear();

    return this.analyticsService.getConsumptionMetrics(familyId, targetMonth, targetYear);
  }

  @Get('waste')
  async getWasteMetrics(
    @Query('familyId') familyId: string,
    @Query('month') month?: string,
    @Query('year') year?: string,
  ) {
    const now = new Date();
    const targetMonth = month ? parseInt(month, 10) : now.getMonth() + 1;
    const targetYear = year ? parseInt(year, 10) : now.getFullYear();

    return this.analyticsService.getWasteMetrics(familyId, targetMonth, targetYear);
  }

  @Get('budget')
  async getBudgetMetrics(
    @Query('familyId') familyId: string,
    @Query('month') month?: string,
    @Query('year') year?: string,
  ) {
    const now = new Date();
    const targetMonth = month ? parseInt(month, 10) : now.getMonth() + 1;
    const targetYear = year ? parseInt(year, 10) : now.getFullYear();

    return this.analyticsService.getBudgetMetrics(familyId, targetMonth, targetYear);
  }
}
