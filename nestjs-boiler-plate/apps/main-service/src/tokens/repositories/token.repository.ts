import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Token, TokenModel } from '../entities/token.entity';
import { CreateTokenDto } from '../dto/create-token.dto';
import { UpdateTokenDto } from '../dto/update-token.dto';
import { PaginateResult } from '../interfaces/pagination-result.interface';

@Injectable()
export class TokenRepository {
  constructor(@InjectModel(Token.name) private tokenModel: TokenModel) {}

  async create(createTokenDto: CreateTokenDto): Promise<Token> {
    const tokenData: any = { ...createTokenDto };
    
    return this.tokenModel.create(tokenData);
  }

  async findAll(filter: any = {}): Promise<Token[]> {
    return this.tokenModel.find(filter).exec();
  }

  async findAllWithPagination(filter: any = {}, options: any = {}): Promise<PaginateResult<Token>> {
    const { page = 1, limit = 10, sortBy, populate } = options;

    // Build options for plugin
    const paginateOptions: any = {
      page: Number(page),
      limit: Number(limit),
      sortBy: sortBy || 'createdAt:desc'
    };

    if (populate) {
      paginateOptions.populate = populate;
    }

    // Use the paginate plugin
    return this.tokenModel.paginate(filter, paginateOptions);
  }

  async findById(id: string): Promise<Token | null> {
    return this.tokenModel.findById(id).exec();
  }

  async update(id: string, updateTokenDto: UpdateTokenDto): Promise<Token | null> {
    const updateData: any = { ...updateTokenDto };
    updateData.updatedAt = new Date();
    
    return this.tokenModel.findByIdAndUpdate(id, updateData, { new: true }).exec();
  }

  async delete(id: string): Promise<Token | null> {
    return this.tokenModel.findByIdAndDelete(id).exec();
  }
}
