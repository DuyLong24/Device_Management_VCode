import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { CategoryController } from './controllers/categories.controller';
import { CategoriesService } from './services/categories.service';
import { CategoryRepository } from './repositories/categories.repository';
import { Category, CategorySchema } from './schemas/categories.schemas';

@Module({
  imports: [
    MongooseModule.forFeature([{ name: Category.name, schema: CategorySchema }])
  ],
  controllers: [CategoryController],
  providers: [CategoriesService, CategoryRepository],
  exports: [CategoriesService, CategoryRepository]
})
export class CategoriesModule { }
