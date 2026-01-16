import { IsString, IsNotEmpty, IsOptional, IsMongoId } from 'class-validator';

export class CreateInventorySessionDto {
    @IsMongoId()
    @IsNotEmpty()
    importId: string; // ID phiếu nhập

    @IsString()
    @IsNotEmpty()
    name: string; // Tên phiên

    @IsString()
    @IsOptional()
    note?: string;
}