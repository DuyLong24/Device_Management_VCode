import { Controller, Get, Post, Body, Patch, Param, Delete, Query, UseGuards } from '@nestjs/common';
import { DefectReasonsService } from './defect-reasons.service';
import { CreateDefectReasonDto } from './dto/create-defect-reason.dto';
import { UpdateDefectReasonDto } from './dto/update-defect-reason.dto';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';

@ApiTags('Defect Reasons')
@Controller('defect-reasons')
export class DefectReasonsController {
  constructor(private readonly defectReasonsService: DefectReasonsService) { }

  @Post()
  @ApiOperation({ summary: 'Tạo nguyên nhân lỗi mới' })
  create(@Body() createDefectReasonDto: CreateDefectReasonDto) {
    return this.defectReasonsService.create(createDefectReasonDto);
  }

  @Get()
  @ApiOperation({ summary: 'Lấy danh sách nguyên nhân lỗi' })
  findAll(@Query() query: any) {
    return this.defectReasonsService.findAll(query);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Lấy chi tiết một nguyên nhân lỗi' })
  findOne(@Param('id') id: string) {
    return this.defectReasonsService.findOne(id);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Cập nhật nguyên nhân lỗi' })
  update(@Param('id') id: string, @Body() updateDefectReasonDto: UpdateDefectReasonDto) {
    return this.defectReasonsService.update(id, updateDefectReasonDto);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Xóa nguyên nhân lỗi' })
  remove(@Param('id') id: string) {
    return this.defectReasonsService.remove(id);
  }
}
