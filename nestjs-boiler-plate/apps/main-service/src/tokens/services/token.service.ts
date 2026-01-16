import { Injectable, NotFoundException, ConflictException, BadRequestException } from '@nestjs/common';
import { TokenRepository } from '../repositories/token.repository';
import { CreateTokenDto } from '../dto/create-token.dto';
import { UpdateTokenDto } from '../dto/update-token.dto';
import { PaginateResult } from '../interfaces/pagination-result.interface';
import { Token } from '../entities/token.entity';

@Injectable()
export class TokenService {
  constructor(private readonly tokenRepository: TokenRepository) {}

  async create(createTokenDto: CreateTokenDto): Promise<Token> {
    return this.tokenRepository.create(createTokenDto);
  }

  async findAll(filter: any = {}): Promise<Token[]> {
    return this.tokenRepository.findAll(filter);
  }

  async findAllWithPagination(filter: any = {}, options: any = {}): Promise<PaginateResult<Token>> {
    return this.tokenRepository.findAllWithPagination(filter, options);
  }

  async findById(id: string): Promise<Token> {
    const token = await this.tokenRepository.findById(id);
    if (!token) {
      throw new NotFoundException('Token not found');
    }
    return token;
  }

  async update(id: string, updateTokenDto: UpdateTokenDto): Promise<Token> {
    const token = await this.tokenRepository.findById(id);
    if (!token) {
      throw new NotFoundException('Token not found');
    }

    const updatedToken = await this.tokenRepository.update(id, updateTokenDto);
    if (!updatedToken) {
      throw new BadRequestException('Failed to update token');
    }

    return updatedToken;
  }

  async delete(id: string): Promise<Token> {
    const token = await this.tokenRepository.findById(id);
    if (!token) {
      throw new NotFoundException('Token not found');
    }

    const deletedToken = await this.tokenRepository.delete(id);
    if (!deletedToken) {
      throw new BadRequestException('Failed to delete token');
    }

    return deletedToken;
  }

  async findByToken(tokenValue: string): Promise<Token | null> {
    const tokens = await this.tokenRepository.findAll({ token: tokenValue });
    return tokens.length > 0 ? tokens[0] : null;
  }

  async deleteByUserId(userId: string): Promise<void> {
    const tokens = await this.tokenRepository.findAll({ userId });
    for (const token of tokens) {
      await this.tokenRepository.delete(token.id || token._id?.toString() || '');
    }
  }
}
