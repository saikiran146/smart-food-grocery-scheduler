import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { AiService } from './ai.service';

@Controller('ai')
@UseGuards(JwtAuthGuard)
export class AiController {
  constructor(private readonly aiService: AiService) {}

  @Get('suggestions')
  async getSuggestions(@Query('familyId') familyId: string) {
    return this.aiService.getSuggestions(familyId);
  }

  @Get('recipe-recommendations')
  async getRecipeRecommendations(@Query('familyId') familyId: string) {
    return this.aiService.getRecipeRecommendations(familyId);
  }

  @Get('grocery-forecast')
  async getGroceryForecast(
    @Query('familyId') familyId: string,
    @Query('period') period: '7' | '15' | '30' = '7',
  ) {
    const days = parseInt(period, 10) as 7 | 15 | 30;
    return this.aiService.getGroceryForecast(familyId, days);
  }

  @Get('waste-reduction-tips')
  async getWasteReductionTips(@Query('familyId') familyId: string) {
    return this.aiService.getWasteReductionTips(familyId);
  }
}
