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
import { FncRoleService } from '../services/fnc-role.service';
import { CreateFncRoleDto } from '../dto/create-fnc-role.dto';
import { UpdateFncRoleDto } from '../dto/update-fnc-role.dto';
import { FncRolePaginationDto } from '../dto/fnc-role-pagination.dto';
import { createFilterAndOptions } from '../../utils/pick.util';

@Controller('fnc-roles')
export class FncRoleController {
  constructor(private readonly fncRoleService: FncRoleService) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  async create(@Body() createFncRoleDto: CreateFncRoleDto) {
    return this.fncRoleService.create(createFncRoleDto);
  }

  @Get()
  async findAll(@Query() query: FncRolePaginationDto) {
    const { filter, options } = createFilterAndOptions(
      query,
      ['permissions'], // Filter keys for exact match
      ['name', 'code'], // Search keys for regex search
      ['sortBy', 'limit', 'page', 'populate']
    );

    // Nếu có tham số phân trang, sử dụng phân trang
    if (query.page || query.limit) {
      return this.fncRoleService.findAllWithPagination(filter, options);
    }
    // Nếu không, trả về tất cả với filter
    return this.fncRoleService.findAll(filter);
  }

  @Get('paginated')
  async findAllPaginated(@Query() query: FncRolePaginationDto) {
    const { filter, options } = createFilterAndOptions(
      query,
      ['permissions'], // Filter keys for exact match
      ['name', 'code'], // Search keys for regex search
      ['sortBy', 'limit', 'page', 'populate']
    );
    
    return this.fncRoleService.findAllWithPagination(filter, options);
  }

  @Get(':id')
  async findById(@Param('id') id: string) {
    return this.fncRoleService.findById(id);
  }

  @Put(':id')
  async update(@Param('id') id: string, @Body() updateFncRoleDto: UpdateFncRoleDto) {
    return this.fncRoleService.update(id, updateFncRoleDto);
  }

  @Delete(':id')
  async delete(@Param('id') id: string) {
    return this.fncRoleService.delete(id);
  }
}
