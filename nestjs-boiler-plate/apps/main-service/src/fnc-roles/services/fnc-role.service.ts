import { Injectable, NotFoundException, ConflictException, BadRequestException } from '@nestjs/common';
import { FncRoleRepository } from '../repositories/fnc-role.repository';
import { CreateFncRoleDto } from '../dto/create-fnc-role.dto';
import { UpdateFncRoleDto } from '../dto/update-fnc-role.dto';
import { PaginateResult } from '../interfaces/pagination-result.interface';
import { FncRole } from '../entities/fnc-role.entity';

@Injectable()
export class FncRoleService {
  constructor(private readonly fncRoleRepository: FncRoleRepository) {}

  async create(createFncRoleDto: CreateFncRoleDto): Promise<FncRole> {
    return this.fncRoleRepository.create(createFncRoleDto);
  }

  async findAll(filter: any = {}): Promise<FncRole[]> {
    return this.fncRoleRepository.findAll(filter);
  }

  async findAllWithPagination(filter: any = {}, options: any = {}): Promise<PaginateResult<FncRole>> {
    return this.fncRoleRepository.findAllWithPagination(filter, options);
  }

  async findById(id: string): Promise<FncRole> {
    const fncrole = await this.fncRoleRepository.findById(id);
    if (!fncrole) {
      throw new NotFoundException('FncRole not found');
    }
    return fncrole;
  }

  async update(id: string, updateFncRoleDto: UpdateFncRoleDto): Promise<FncRole> {
    const fncrole = await this.fncRoleRepository.findById(id);
    if (!fncrole) {
      throw new NotFoundException('FncRole not found');
    }

    const updatedFncRole = await this.fncRoleRepository.update(id, updateFncRoleDto);
    if (!updatedFncRole) {
      throw new BadRequestException('Failed to update fncrole');
    }

    return updatedFncRole;
  }

  async delete(id: string): Promise<FncRole> {
    const fncrole = await this.fncRoleRepository.findById(id);
    if (!fncrole) {
      throw new NotFoundException('FncRole not found');
    }

    const deletedFncRole = await this.fncRoleRepository.delete(id);
    if (!deletedFncRole) {
      throw new BadRequestException('Failed to delete fncrole');
    }

    return deletedFncRole;
  }
}
