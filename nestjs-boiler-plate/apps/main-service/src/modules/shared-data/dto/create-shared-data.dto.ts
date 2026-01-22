
import { IsString, IsNotEmpty, IsOptional, IsNumber, IsMongoId } from 'class-validator';

export class CreateSharedDataGroupDto {
    @IsNotEmpty()
    @IsString()
    code: string;

    @IsNotEmpty()
    @IsString()
    name: string;

    @IsOptional()
    @IsString()
    description?: string;
}

export class CreateSharedDataDto {
    @IsNotEmpty()
    @IsString()
    code: string;

    @IsNotEmpty()
    @IsString()
    name: string;

    @IsOptional()
    @IsString()
    description?: string;

    @IsNotEmpty()
    @IsMongoId()
    groupId: string;

    @IsOptional()
    @IsNumber()
    order?: number;
}
