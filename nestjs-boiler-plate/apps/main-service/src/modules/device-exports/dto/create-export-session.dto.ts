import { IsNotEmpty, IsOptional, IsString } from 'class-validator';

export class CreateExportSessionDto {
    @IsNotEmpty()
    @IsString()
    exportId: string;

    @IsOptional()
    @IsString()
    sessionName?: string;

    @IsOptional()
    @IsString()
    note?: string;
}
