import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Category, CategoryModel } from '../schemas/categories.schemas';
import { CreateCategoryDto } from '../dto/create-categories.dto';
import { UpdateCategoryDto } from '../dto/update-categories.dto';
import { PaginateResult } from '../interfaces/pagination-result.interface';

@Injectable()
export class CategoryRepository {
  constructor(@InjectModel(Category.name) private categoryModel: CategoryModel) { }

  async findOne(filter: any): Promise<Category | null> {
    return this.categoryModel.findOne(filter).exec();
  }

  async create(createCategoryDto: CreateCategoryDto): Promise<Category> {
    const categoryData: any = { ...createCategoryDto };

    return this.categoryModel.create(categoryData);
  }

  async findAll(filter: any = {}): Promise<Category[]> {
    return this.categoryModel.find(filter).exec();
  }

  async findAllWithPagination(filter: any = {}, options: any = {}): Promise<PaginateResult<Category>> {
    const { page = 1, limit = 10, sortBy, populate } = options;

    const paginateOptions: any = {
      page: Number(page),
      limit: Number(limit),
      sortBy: sortBy || 'createdAt:desc'
    };

    if (populate) {
      paginateOptions.populate = populate;
    }

    return this.categoryModel.paginate(filter, paginateOptions);
  }

  async findById(id: string): Promise<Category | null> {
    return this.categoryModel.findById(id).exec();
  }

  async update(id: string, updateCategoryDto: UpdateCategoryDto): Promise<Category | null> {
    const updateData: any = { ...updateCategoryDto };
    updateData.updatedAt = new Date();

    return this.categoryModel.findByIdAndUpdate(id, updateData, { new: true }).exec();
  }

  async delete(id: string): Promise<Category | null> {
    return this.categoryModel.findByIdAndDelete(id).exec();
  }
}
