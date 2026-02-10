
import { Controller, Get, Post, Put, Delete, Body, Query, Param } from '@nestjs/common';
import { SharedDataService } from '../services/shared-data.service';
import { CreateSharedDataDto, CreateSharedDataGroupDto } from '../dto/create-shared-data.dto';
import { UpdateSharedDataDto, UpdateSharedDataGroupDto } from '../dto/update-shared-data.dto';
import { Unprotected } from 'nest-keycloak-connect';

@Controller('shared-data')
export class SharedDataController {
    constructor(private readonly service: SharedDataService) { }

    @Post('groups')
    createGroup(@Body() dto: CreateSharedDataGroupDto) {
        return this.service.createGroup(dto);
    }

    @Get('groups')
    @Unprotected()
    getGroups() {
        return this.service.getGroups();
    }

    @Post('data')
    createData(@Body() dto: CreateSharedDataDto) {
        return this.service.createData(dto);
    }

    @Get('data')
    @Unprotected()
    getData(@Query('groupCode') groupCode: string, @Query('groupId') groupId: string) {
        if (groupCode) return this.service.getDataByGroupCode(groupCode);
        if (groupId) return this.service.getDataByGroupId(groupId);
        return [];
    }

    @Put('groups/:id')
    updateGroup(@Param('id') id: string, @Body() dto: UpdateSharedDataGroupDto) {
        return this.service.updateGroup(id, dto);
    }

    @Delete('groups/:id')
    deleteGroup(@Param('id') id: string) {
        return this.service.deleteGroup(id);
    }

    @Put('data/:id')
    updateData(@Param('id') id: string, @Body() dto: UpdateSharedDataDto) {
        return this.service.updateData(id, dto);
    }

    @Delete('data/:id')
    deleteData(@Param('id') id: string) {
        return this.service.deleteData(id);
    }
}
