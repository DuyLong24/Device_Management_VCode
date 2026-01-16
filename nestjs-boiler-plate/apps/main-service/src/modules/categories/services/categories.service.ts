import { Injectable, NotFoundException, ConflictException, BadRequestException } from '@nestjs/common';
import { CategoryRepository } from '../repositories/categories.repository';
import { CreateCategoryDto } from '../dto/create-categories.dto';
import { UpdateCategoryDto } from '../dto/update-categories.dto';
import { PaginateResult } from '../interfaces/pagination-result.interface';
import { Category } from '../schemas/categories.schemas';

@Injectable()
export class CategoriesService {
  constructor(private readonly categoryRepository: CategoryRepository) { }

  async create(createCategoryDto: CreateCategoryDto): Promise<Category> {
    return this.categoryRepository.create(createCategoryDto);
  }

  async findAll(filter: any = {}): Promise<Category[]> {
    return this.categoryRepository.findAll(filter);
  }

  async findAllWithPagination(filter: any = {}, options: any = {}): Promise<PaginateResult<Category>> {
    return this.categoryRepository.findAllWithPagination(filter, options);
  }

  async findById(id: string): Promise<Category> {
    const category = await this.categoryRepository.findById(id);
    if (!category) {
      throw new NotFoundException('Category not found');
    }
    return category;
  }

  async update(id: string, updateCategoryDto: UpdateCategoryDto): Promise<Category> {
    const category = await this.categoryRepository.findById(id);
    if (!category) {
      throw new NotFoundException('Category not found');
    }

    const updatedCategory = await this.categoryRepository.update(id, updateCategoryDto);
    if (!updatedCategory) {
      throw new BadRequestException('Failed to update category');
    }

    return updatedCategory;
  }

  async delete(id: string): Promise<Category> {
    const category = await this.categoryRepository.findById(id);
    if (!category) {
      throw new NotFoundException('Category not found');
    }

    const deletedCategory = await this.categoryRepository.delete(id);
    if (!deletedCategory) {
      throw new BadRequestException('Failed to delete category');
    }

    return deletedCategory;
  }
}
