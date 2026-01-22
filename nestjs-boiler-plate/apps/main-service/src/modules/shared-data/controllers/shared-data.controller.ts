
import { Controller, Get, Post, Body, Query, Param } from '@nestjs/common';
import { SharedDataService } from '../services/shared-data.service';
import { CreateSharedDataDto, CreateSharedDataGroupDto } from '../dto/create-shared-data.dto';

@Controller('shared-data')
export class SharedDataController {
    constructor(private readonly service: SharedDataService) { }

    @Post('groups')
    createGroup(@Body() dto: CreateSharedDataGroupDto) {
        return this.service.createGroup(dto);
    }

    @Get('groups')
    getGroups() {
        return this.service.getGroups();
    }

    @Post('data')
    createData(@Body() dto: CreateSharedDataDto) {
        return this.service.createData(dto);
    }

    @Get('data')
    getData(@Query('groupCode') groupCode: string, @Query('groupId') groupId: string) {
        if (groupCode) return this.service.getDataByGroupCode(groupCode);
        if (groupId) return this.service.getDataByGroupId(groupId);
        return [];
    }
}
