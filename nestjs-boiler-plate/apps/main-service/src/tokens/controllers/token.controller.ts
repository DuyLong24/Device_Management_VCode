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
import { TokenService } from '../services/token.service';
import { CreateTokenDto } from '../dto/create-token.dto';
import { UpdateTokenDto } from '../dto/update-token.dto';
import { TokenPaginationDto } from '../dto/token-pagination.dto';
import { createFilterAndOptions } from '../../utils/pick.util';

@Controller('tokens')
export class TokenController {
  constructor(private readonly tokenService: TokenService) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  async create(@Body() createTokenDto: CreateTokenDto) {
    return this.tokenService.create(createTokenDto);
  }

  @Get()
  async findAll(@Query() query: TokenPaginationDto) {
    const { filter, options } = createFilterAndOptions(
      query,
      ['userId', 'expires', 'blacklisted'], // Filter keys for exact match
      ['token', 'type'], // Search keys for regex search
      ['sortBy', 'limit', 'page', 'populate']
    );

    // Nếu có tham số phân trang, sử dụng phân trang
    if (query.page || query.limit) {
      return this.tokenService.findAllWithPagination(filter, options);
    }
    // Nếu không, trả về tất cả với filter
    return this.tokenService.findAll(filter);
  }

  @Get('paginated')
  async findAllPaginated(@Query() query: TokenPaginationDto) {
    const { filter, options } = createFilterAndOptions(
      query,
      ['userId', 'expires', 'blacklisted'], // Filter keys for exact match
      ['token', 'type'], // Search keys for regex search
      ['sortBy', 'limit', 'page', 'populate']
    );
    
    return this.tokenService.findAllWithPagination(filter, options);
  }

  @Get(':id')
  async findById(@Param('id') id: string) {
    return this.tokenService.findById(id);
  }

  @Put(':id')
  async update(@Param('id') id: string, @Body() updateTokenDto: UpdateTokenDto) {
    return this.tokenService.update(id, updateTokenDto);
  }

  @Delete(':id')
  async delete(@Param('id') id: string) {
    return this.tokenService.delete(id);
  }
}
