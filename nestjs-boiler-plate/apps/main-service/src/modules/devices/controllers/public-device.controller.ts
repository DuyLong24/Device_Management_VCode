import { Controller, Get, Query, NotFoundException } from '@nestjs/common';
import { Unprotected } from 'nest-keycloak-connect';
import { DeviceService } from '../services/device.service';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';

@Controller('public/devices')
@ApiTags('Public Devices')
@Unprotected()
export class PublicDeviceController {
    constructor(private readonly deviceService: DeviceService) { }

    @Get('warranty-check')
    @ApiOperation({ summary: 'Kiểm tra bảo hành thiết bị theo Serial hoặc MAC' })
    @ApiResponse({ status: 200, description: 'Thông tin bảo hành được trả về.' })
    @ApiResponse({ status: 404, description: 'Thiết bị không tìm thấy.' })
    async checkWarranty(@Query('serial') input: string) {
        if (!input) {
            throw new NotFoundException('Vui lòng nhập Serial hoặc MAC address (Please provide Serial or MAC)');
        }

        const searchTerms = input.split(/[\n,;]+/).map(s => s.trim()).filter(s => s.length > 0);

        if (searchTerms.length === 0) {
            throw new NotFoundException('Vui lòng nhập ít nhất một mã (Please provide at least one code)');
        }

        const results = [];

        for (const term of searchTerms) {
            let device: any = null;

            const cleanTerm = term.replace(/[:.\s-]/g, '');
            const isHex = /^[a-fA-F0-9]+$/.test(cleanTerm);

            const conditions: any[] = [
                { serial: term },
                { mac: term }
            ];

            if (isHex && cleanTerm.length > 0) {
                // Tạo regex để tìm kiếm MAC theo nhiều định dạng khác nhau
                // Matches: AA:BB, AA-BB, AA.BB, AABB
                const fuzzyRegex = cleanTerm.split('').join('[:\\.-]?');
                conditions.push({ mac: { $regex: new RegExp(`^${fuzzyRegex}$`, 'i') } });
            }

            // Execute Search
            const devices = await this.deviceService.findAll({ $or: conditions });

            if (devices && devices.length > 0) {
                device = devices[0];
            }

            if (device) {
                if (!device.warehouseId || !device.warehouseId.code) {
                    await device.populate('warehouseId');
                }

                const allowedCodes = ['SOLD', 'SOLD_WARRANTY', 'NOT_ACTIVATED'];
                const warehouseCode = device.warehouseId?.code;

                if (!allowedCodes.includes(warehouseCode)) {
                    device = null;
                }
            }

            if (device) {
                results.push({
                    input: term,
                    found: true,
                    data: {
                        deviceName: device.name,
                        model: device.deviceModel,
                        serial: device.serial,
                        mac: device.mac,
                        warrantyMonths: device.warrantyMonths,
                        activationDate: device.warrantyActivatedDate || device.activationDate,
                        expirationDate: device.warrantyExpiredDate,
                        status: this.calculateStatus(device.warrantyExpiredDate),
                    }
                });
            } else {
                results.push({
                    input: term,
                    found: false,
                    error: 'Không tìm thấy hoặc chưa xuất kho (Not Found or Not Exported)'
                });
            }
        }

        return results;
    }

    private calculateStatus(expiredDate?: Date): 'ACTIVE' | 'EXPIRED' | 'UNKNOWN' {
        if (!expiredDate) return 'UNKNOWN';
        const now = new Date();
        const exp = new Date(expiredDate);
        return exp > now ? 'ACTIVE' : 'EXPIRED';
    }
}
