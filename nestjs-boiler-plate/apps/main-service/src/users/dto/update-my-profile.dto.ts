import { IsOptional, IsString, MinLength, Matches, IsDateString } from 'class-validator';

export class UpdateMyProfileDto {
    @IsOptional()
    @IsString()
    @MinLength(1, { message: 'Tên phải có ít nhất 1 ký tự' })
    name?: string;

    @IsOptional()
    @IsString()
    @Matches(/^[0-9]{10}$/, { message: 'Số điện thoại phải là 10 chữ số' })
    phoneNumber?: string;

    @IsOptional()
    @IsDateString({}, { message: 'Ngày sinh phải là một chuỗi ngày tháng hợp lệ' })
    dateOfBirth?: string;
}
