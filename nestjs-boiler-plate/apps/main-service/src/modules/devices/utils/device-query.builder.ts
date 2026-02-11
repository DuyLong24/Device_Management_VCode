import { DevicePaginationDto } from '../dto/device-pagination.dto';

export class DeviceQueryBuilder {
    static build(query: DevicePaginationDto): any {
        const filter: any = {};

        // 1. Lọc theo kho
        if (query.warehouseId) filter.warehouseId = query.warehouseId;
        if (query.categoryId) filter.categoryId = query.categoryId;

        // 2. Lọc theo mã phiếu nhập/xuất
        if (query.importId) {
            filter.importId = query.importId;
        }

        if (query.exportId) {
            filter.currentExportId = query.exportId;
        }

        // 3. Lọc theo mã serial, mã MAC, tên thiết bị, model
        if (query.serial) filter.serial = { $regex: query.serial, $options: 'i' };
        if (query.mac) {
            const macQuery = query.mac.trim();
            // Nếu query không có dấu cách, cho phép tìm kiếm với các dấu cách
            if (/^[a-fA-F0-9]+$/.test(macQuery)) {
                const fuzzyRegex = macQuery.split('').join('[:\\.-]?');
                filter.mac = { $regex: fuzzyRegex, $options: 'i' };
            } else {
                filter.mac = { $regex: macQuery, $options: 'i' };
            }
        }
        if (query.name) filter.name = { $regex: query.name, $options: 'i' };
        if (query.model) filter.deviceModel = { $regex: query.model, $options: 'i' };

        // 4. Lọc theo từ khóa (Global Search)
        if (query.search) {
            const searchStr = query.search.trim();
            const searchRegex = { $regex: searchStr, $options: 'i' };
            const orConditions: any[] = [
                { serial: searchRegex },
                { name: searchRegex },
                { deviceModel: searchRegex }
            ];

            // Tìm kiếm MAC theo định dạng fuzzy
            if (/^[a-fA-F0-9]+$/.test(searchStr)) {
                const fuzzyMacRegex = { $regex: searchStr.split('').join('[:\\.-]?'), $options: 'i' };
                orConditions.push({ mac: fuzzyMacRegex });
            } else {
                orConditions.push({ mac: searchRegex });
            }

            if (Object.keys(filter).length > 0) {
                filter.$or = orConditions;
            } else {
                Object.assign(filter, { $or: orConditions });
            }
        }

        // 5. Lọc theo ngày tạo
        if (query.createdFrom || query.createdTo) {
            filter.createdAt = {};
            if (query.createdFrom) filter.createdAt.$gte = new Date(query.createdFrom);
            if (query.createdTo) filter.createdAt.$lte = new Date(query.createdTo);
        }

        return filter;
    }
}
