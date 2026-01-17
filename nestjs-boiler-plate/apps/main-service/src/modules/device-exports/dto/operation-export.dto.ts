import { IsEnum, IsNotEmpty, IsOptional, IsString, IsDate } from 'class-validator';
import { ExportStatus } from '../../../common/constants/export-status.constant';

export class ApproveDeviceExportDto {
    @IsEnum(ExportStatus)
    @IsNotEmpty()
    status: ExportStatus.APPROVED;

    @IsString()
    @IsNotEmpty()
    approvedBy: string;

    @IsDate()
    @IsNotEmpty()
    approvedDate: Date;
}

export class RejectDeviceExportDto {
    @IsEnum(ExportStatus)
    @IsNotEmpty()
    status: ExportStatus.REJECTED;

    @IsString()
    @IsNotEmpty()
    rejectedReason: string;
}

export class SubmitForApprovalDto {
    @IsEnum(ExportStatus)
    @IsNotEmpty()
    status: ExportStatus.PENDING_APPROVAL;
}

export class ConfirmDeviceExportDto {
    @IsEnum(ExportStatus)
    @IsNotEmpty()
    status: ExportStatus.COMPLETED;

    @IsDate()
    @IsNotEmpty()
    exportDate: Date;
}
