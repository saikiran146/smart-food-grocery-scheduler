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
  ApiParam,
  ApiQuery,
  ApiResponse,
} from '@nestjs/swagger';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RecipesService } from './recipes.service';
import { CreateRecipeDto } from './dto/create-recipe.dto';
import { UpdateRecipeDto } from './dto/update-recipe.dto';
import { RecipeFilterDto } from './dto/recipe-filter.dto';

@ApiTags('recipes')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('recipes')
export class RecipesController {
  constructor(private readonly recipesService: RecipesService) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Create a new recipe with optional ingredients' })
  @ApiResponse({ status: 201, description: 'Recipe created successfully' })
  create(@Body() dto: CreateRecipeDto) {
    return this.recipesService.create(dto);
  }

  @Get('suggest')
  @ApiOperation({
    summary: 'Suggest recipes based on available ingredient names',
    description:
      'Pass a comma-separated list of ingredient names. Returns recipes sorted by the number of matching ingredients.',
  })
  @ApiQuery({
    name: 'ingredients',
    required: true,
    description: 'Comma-separated ingredient names e.g. potato,onion,tomato',
    example: 'potato,onion,tomato',
  })
  @ApiResponse({ status: 200, description: 'Returns recipes sorted by match count' })
  suggest(@Query('ingredients') ingredients: string) {
    const names = ingredients
      ? ingredients.split(',').map((s) => s.trim()).filter(Boolean)
      : [];
    return this.recipesService.suggest(names);
  }

  @Get()
  @ApiOperation({ summary: 'List recipes with optional filters and pagination' })
  @ApiResponse({ status: 200, description: 'Returns paginated list of recipes' })
  findAll(@Query() filters: RecipeFilterDto) {
    return this.recipesService.findAll(filters);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a recipe by ID with full ingredient details' })
  @ApiParam({ name: 'id', description: 'Recipe ID' })
  @ApiResponse({ status: 200, description: 'Returns recipe with ingredients' })
  @ApiResponse({ status: 404, description: 'Recipe not found' })
  findOne(@Param('id') id: string) {
    return this.recipesService.findOne(id);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update a recipe (replaces ingredients list if provided)' })
  @ApiParam({ name: 'id', description: 'Recipe ID' })
  @ApiResponse({ status: 200, description: 'Recipe updated successfully' })
  @ApiResponse({ status: 404, description: 'Recipe not found' })
  update(@Param('id') id: string, @Body() dto: UpdateRecipeDto) {
    return this.recipesService.update(id, dto);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Delete a recipe' })
  @ApiParam({ name: 'id', description: 'Recipe ID' })
  @ApiResponse({ status: 200, description: 'Recipe deleted successfully' })
  @ApiResponse({ status: 404, description: 'Recipe not found' })
  remove(@Param('id') id: string) {
    return this.recipesService.remove(id);
  }
}
