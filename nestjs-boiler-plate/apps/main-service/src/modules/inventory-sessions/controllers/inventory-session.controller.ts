import { Controller, Post, Body, Get, Query, Put, Param, Request, HttpStatus, HttpCode, Delete, UnauthorizedException } from '@nestjs/common';
import { InventorySessionService } from '../services/inventory-session.service';
import { CreateInventorySessionDto } from '../dto/create-inventory-session.dto';
import { UpdateInventorySessionDto } from '../dto/update-inventory-session.dto';
import { InventorySessionPaginationDto } from '../dto/inventory-session-pagination.dto';
import { UserService } from '../../../users/services/user.service';

@Controller('inventory-sessions')
export class InventorySessionController {
    constructor(
        private readonly sessionService: InventorySessionService,
        private readonly userService: UserService
    ) { }

    @Post()
    @HttpCode(HttpStatus.CREATED)
    async create(@Body() createDto: CreateInventorySessionDto, @Request() req: any) {
        if (!req.user) {
            throw new UnauthorizedException('Yêu cầu thông tin người dùng (User context required)');
        }
        const user = await this.userService.syncFromKeycloak(req.user);
        const userId = user._id.toString();
        return this.sessionService.create(createDto, userId);
    }

    @Put(':id')
    async update(@Param('id') id: string, @Body() updateDto: UpdateInventorySessionDto, @Request() req: any) {
        if (!req.user) {
            throw new UnauthorizedException('Yêu cầu thông tin người dùng (User context required)');
        }
        const user = await this.userService.syncFromKeycloak(req.user);
        const userId = user._id.toString();
        return this.sessionService.update(id, updateDto, userId);
    }

    @Get()
    async findAll(@Query() query: InventorySessionPaginationDto) {
        const filter: any = {};

        if (query.importId) {
            filter.importId = query.importId;
        }

        if (query.status) {
            filter.status = query.status;
        }

        if (query.search) {
            filter.$or = [
                { name: { $regex: query.search, $options: 'i' } },
                { code: { $regex: query.search, $options: 'i' } },
            ];
        }

        return this.sessionService.findAll(filter);
    }

    @Get(':id')
    async findById(@Param('id') id: string) {
        return this.sessionService.findById(id);
    }

    @Delete(':id/items/:serial')
    async removeItem(@Param('id') id: string, @Param('serial') serial: string) {
        return this.sessionService.removeItem(id, serial);
    }
}