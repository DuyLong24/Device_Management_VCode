import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { CategoryRepository } from '../repositories/categories.repository';
import { CreateCategoryDto } from '../dto/create-categories.dto';
import { UpdateCategoryDto } from '../dto/update-categories.dto';
import { PaginateResult } from '../interfaces/pagination-result.interface';
import { Category } from '../schemas/categories.schemas';
import { ERROR_MESSAGES } from 'apps/main-service/src/common/constants/messages.constants';
import { FilterQuery } from 'mongoose';

@Injectable()
export class CategoriesService {
  constructor(private readonly categoryRepository: CategoryRepository) { }

  async create(createCategoryDto: CreateCategoryDto): Promise<Category> {
    try {
      return await this.categoryRepository.create(createCategoryDto);
    } catch (error) {
      throw new BadRequestException(ERROR_MESSAGES.CATEGORY.CREATE_FAILED);
    }
  }

  async findAll(filter: FilterQuery<Category> = {}): Promise<Category[]> {
    return this.categoryRepository.findAll(filter);
  }

  async findAllWithPagination(filter: FilterQuery<Category> = {}, options: any = {}): Promise<PaginateResult<Category>> {
    return this.categoryRepository.findAllWithPagination(filter, options);
  }

  async findById(id: string): Promise<Category> {
    const category = await this.categoryRepository.findById(id);
    if (!category) {
      throw new NotFoundException(ERROR_MESSAGES.CATEGORY.NOT_FOUND);
    }
    return category;
  }

  async update(id: string, updateCategoryDto: UpdateCategoryDto): Promise<Category> {
    const category = await this.categoryRepository.findById(id);
    if (!category) {
      throw new NotFoundException(ERROR_MESSAGES.CATEGORY.NOT_FOUND);
    }

    const updatedCategory = await this.categoryRepository.update(id, updateCategoryDto);
    if (!updatedCategory) {
      throw new BadRequestException(ERROR_MESSAGES.CATEGORY.UPDATE_FAILED);
    }

    return updatedCategory;
  }

  async delete(id: string): Promise<Category> {
    const category = await this.categoryRepository.findById(id);
    if (!category) {
      throw new NotFoundException(ERROR_MESSAGES.CATEGORY.NOT_FOUND);
    }

    const deletedCategory = await this.categoryRepository.delete(id);
    if (!deletedCategory) {
      throw new BadRequestException(ERROR_MESSAGES.CATEGORY.DELETE_FAILED);
    }

    return deletedCategory;
  }
}
