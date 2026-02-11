import { Controller, Get } from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { DeviceService } from '../../devices/services/device.service';
import { DeviceExportService } from '../../device-exports/services/device-export.service';

@ApiTags('Inventory')
@Controller('inventory')
export class StockController {
    constructor(
        private readonly deviceService: DeviceService,
        private readonly deviceExportService: DeviceExportService,
    ) { }

    @Get('stock-summary')
    @ApiOperation({ summary: 'Lấy tổng hợp tồn kho (Thực tế - Đang giữ = Khả dụng)' })
    async getStockSummary() {
        // 1. Lấy tổng số lượng thực tế trong kho
        const rawStock = await this.deviceService.getStockSummary();

        // 2. Lấy số lượng đã được giữ lại từ các phiếu xuất đang chờ xử lý
        const reservedMap = await this.deviceExportService.getAllReservedQuantity();

        // 3. Gộp và tính toán số lượng khả dụng
        return rawStock.map(item => {
            const reserved = reservedMap.get(item.deviceModel) || 0;
            return {
                ...item,
                total: item.count,
                reserved: reserved,
                available: Math.max(0, item.count - reserved)
            };
        });
    }
}
