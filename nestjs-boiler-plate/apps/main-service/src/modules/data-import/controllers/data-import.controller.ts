
import { Controller, Post, UseInterceptors, UploadedFile, Body, Param, Get } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { DataImportService } from '../services/data-import.service';

@Controller('data-import')
export class DataImportController {
    constructor(private readonly dataImportService: DataImportService) { }

    @Post('upload')
    @UseInterceptors(FileInterceptor('file'))
    uploadFile(@UploadedFile() file: Express.Multer.File) {
        return this.dataImportService.createSession(file);
    }

    @Post(':id/preview')
    getPreview(
        @Param('id') id: string,
        @Body() body: { sheetName: string; headerRow: number }
    ) {
        return this.dataImportService.getPreview(id, body.sheetName, body.headerRow);
    }

    @Post(':id/validate')
    validate(
        @Param('id') id: string,
        @Body() body: { mapping: Record<string, string>; strategy: string; payload?: any }
    ) {
        return this.dataImportService.validate(id, body.mapping, body.strategy, body.payload);
    }

    @Post(':id/execute')
    execute(
        @Param('id') id: string,
        @Body() body: { strategy: string; payload?: any }
    ) {
        return this.dataImportService.execute(id, body.strategy, body.payload);
    }
}
