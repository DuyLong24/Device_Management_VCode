import {
  Controller,
  Post,
  Body,
  Get,
  Query,
  Put,
  Delete,
  Param,
  HttpStatus,
  HttpCode
} from '@nestjs/common';
import { CategoriesService } from '../services/categories.service';
import { CreateCategoryDto } from '../dto/create-categories.dto';
import { UpdateCategoryDto } from '../dto/update-categories.dto';
import { CategoryPaginationDto } from '../dto/categories-pagination.dto';
import { createFilterAndOptions } from '../../../utils/pick.util';

@Controller('categories')
export class CategoryController {
  constructor(private readonly categoryService: CategoriesService) { }

  @Post()
  @HttpCode(HttpStatus.CREATED)
  async create(@Body() createCategoryDto: CreateCategoryDto) {
    return this.categoryService.create(createCategoryDto);
  }

  @Get()
  async findAll(@Query() query: CategoryPaginationDto) {
    const { filter, options } = createFilterAndOptions(
      query,
      [],
      ['name', 'description'], // Search keys for regex search
      ['sortBy', 'limit', 'page', 'populate']
    );

    // Nếu có tham số phân trang, sử dụng phân trang
    if (query.page || query.limit) {
      return this.categoryService.findAllWithPagination(filter, options);
    }
    // Nếu không, trả về tất cả với filter
    return this.categoryService.findAll(filter);
  }

  @Get('paginated')
  async findAllPaginated(@Query() query: CategoryPaginationDto) {
    const { filter, options } = createFilterAndOptions(
      query,
      [],
      ['name', 'description'],
      ['sortBy', 'limit', 'page', 'populate']
    );

    return this.categoryService.findAllWithPagination(filter, options);
  }

  @Get(':id')
  async findById(@Param('id') id: string) {
    return this.categoryService.findById(id);
  }

  @Put(':id')
  async update(@Param('id') id: string, @Body() updateCategoryDto: UpdateCategoryDto) {
    return this.categoryService.update(id, updateCategoryDto);
  }

  @Delete(':id')
  async delete(@Param('id') id: string) {
    return this.categoryService.delete(id);
  }
}
