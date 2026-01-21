import { IsString, IsNotEmpty, IsOptional } from 'class-validator';

export class RejectExportDto {
    @IsString()
    @IsNotEmpty()
    reason: string;
}

export class AddItemsDto {
    @IsString({ each: true })
    @IsNotEmpty()
    serials: string[];
}
