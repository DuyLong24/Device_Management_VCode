import { IsString, IsNotEmpty, IsOptional, IsBoolean } from 'class-validator';

export class CreateDefectReasonDto {
    @IsString()
    @IsNotEmpty()
    code!: string;

    @IsString()
    @IsNotEmpty()
    name!: string;

    @IsString()
    @IsOptional()
    description?: string;

    @IsBoolean()
    @IsOptional()
    isActive?: boolean;
}
