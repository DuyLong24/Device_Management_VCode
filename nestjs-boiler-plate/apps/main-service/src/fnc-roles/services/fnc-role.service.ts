import { Injectable, NotFoundException, ConflictException, BadRequestException, Inject, forwardRef } from '@nestjs/common';
import { FncRoleRepository } from '../repositories/fnc-role.repository';
import { CreateFncRoleDto } from '../dto/create-fnc-role.dto';
import { UpdateFncRoleDto } from '../dto/update-fnc-role.dto';
import { PaginateResult } from '../interfaces/pagination-result.interface';
import { FncRole } from '../entities/fnc-role.entity';
import { KeycloakAdminService } from '../../policy-admin/keycloak-admin.service';

@Injectable()
export class FncRoleService {
  constructor(
    private readonly fncRoleRepository: FncRoleRepository,
    @Inject(forwardRef(() => KeycloakAdminService))
    private readonly keycloakAdminService: KeycloakAdminService,
  ) { }

  async create(createFncRoleDto: CreateFncRoleDto): Promise<FncRole> {
    // 1. Create in MongoDB
    const role = await this.fncRoleRepository.create(createFncRoleDto);

    // 2. Sync to Keycloak (non-blocking, log warning on failure)
    try {
      await this.keycloakAdminService.createRealmRole(role.code);
      console.log(`[FncRoleService] Role '${role.code}' synced to Keycloak`);
    } catch (error) {
      console.warn(`[FncRoleService] Failed to sync role '${role.code}' to Keycloak:`, error.message);
      // Don't throw - MongoDB role is created, Keycloak sync is optional
    }

    return role;
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

    // Guard: Prevent updating Super Admin
    if (fncrole.code === 'super_admin' || fncrole.code === 'SUPER_ADMIN') {
      throw new BadRequestException('Cannot modify Super Admin role');
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

  async getPermissionsByCodes(codes: string[]): Promise<string[]> {
    const roles = await this.fncRoleRepository.findAll({ code: { $in: codes } });
    const permissions = new Set<string>();

    roles.forEach(role => {
      if (role.permissions) {
        role.permissions.forEach(p => permissions.add(p));
      }
    });

    return Array.from(permissions);
  }
}
