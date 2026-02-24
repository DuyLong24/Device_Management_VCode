
import { Injectable, OnModuleInit, Logger } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { FncRole } from '../../fnc-roles/entities/fnc-role.entity';
import { User } from '../../users/entities/user.entity';
import { WarehouseGroup } from '../../modules/warehouse-groups/schemas/warehouse-group.schemas';
import { Warehouse } from '../../modules/warehouses/schemas/warehouse.schemas';
import { WarehouseTransition } from '../../modules/warehouse-transitions/schemas/warehouse-transition.schemas';
import { Device } from '../../modules/devices/schemas/device.schemas';
import { Category } from '../../modules/categories/schemas/categories.schemas';
import { DeviceImport } from '../../modules/device-imports/schemas/device-import.schemas';
import { SharedDataRepository } from '../../modules/shared-data/repositories/shared-data.repository';
import { UserKeycloakIntegrationService } from '../../users/services/user-keycloak-integration.service';
import * as bcrypt from 'bcrypt';
import { WarehouseCode, TransitionType, ActionType } from '../constants/warehouse.constant';

@Injectable()
export class SeedService implements OnModuleInit {
    private readonly logger = new Logger(SeedService.name);

    constructor(
        @InjectModel(FncRole.name) private fncRoleModel: Model<FncRole>,
        @InjectModel(User.name) private userModel: Model<User>,
        @InjectModel(WarehouseGroup.name) private warehouseGroupModel: Model<WarehouseGroup>,
        @InjectModel(Warehouse.name) private warehouseModel: Model<Warehouse>,
        @InjectModel(WarehouseTransition.name) private warehouseTransitionModel: Model<WarehouseTransition>,
        @InjectModel(Device.name) private deviceModel: Model<Device>,
        @InjectModel(Category.name) private categoryModel: Model<Category>,
        @InjectModel(DeviceImport.name) private deviceImportModel: Model<DeviceImport>,
        private readonly sharedDataRepository: SharedDataRepository,
        private readonly userKeycloakIntegrationService: UserKeycloakIntegrationService,
    ) { }

    async onModuleInit() {
        this.logger.warn('=== SEED SERVICE STARTING ==='); // Warn level to show up
        await this.seedRoles();
        await this.seedCategories();
        await this.seedWarehousesAndTransitions();
        // await this.seedDevices();
        await this.seedSharedData();
        this.logger.warn('=== SEED SERVICE COMPLETED ===');
    }

    // --- 1. SEED ROLES ---
    private async seedRoles() {
        const roles = [
            { name: 'Super Admin', code: 'super_admin', description: 'Full access' },
            { name: 'Admin', code: 'admin', description: 'Full access' },
            { name: 'Users', code: 'users', description: 'Full access' },
        ];

        for (const role of roles) {
            const exists = await this.fncRoleModel.findOne({ code: role.code });
            if (!exists) {
                await this.fncRoleModel.create(role);
                this.logger.log(`Created Role: ${role.name}`);
            }
        }
    }

    // --- 2.5 SEED CATEGORIES ---
    private async seedCategories() {
        const categories = [
            { name: 'Camera', description: 'Camera thiết bị giám sát', isActive: true },
            { name: 'Barrier', description: 'Barrier tự động', isActive: true },
            { name: 'Màn hình', description: 'Màn hình hiển thị', isActive: true },
        ];

        for (const category of categories) {
            const exists = await this.categoryModel.findOne({ name: category.name });
            if (!exists) {
                await this.categoryModel.create(category);
                this.logger.log(`Created Category: ${category.name}`);
            }
        }
    }

    // --- 3. SEED WAREHOUSES & TRANSITIONS (Config-driven) ---
    private async seedWarehousesAndTransitions() {
        const internalGroup = await this.ensureGroup('Kho nội bộ', 'INTERNAL', 1);
        const warrantyGroup = await this.ensureGroup('Kho bảo hành', 'WARRANTY', 2);
        const exportedGroup = await this.ensureGroup('Đã xuất', 'EXPORTED', 3);

        // B. Tạo Warehouses (Logic + UI Config)
        const warehousesData = [
            // 1. Kho Chờ QC
            {
                code: WarehouseCode.PENDING_QC,
                name: 'Chờ QC',
                groupId: internalGroup._id,
                color: 'blue',
                orderIndex: 1,
                icon: 'clock-circle',
                config: {
                    columns: [
                        { key: 'mac', title: 'MAC Address', type: 'text' },
                        { key: 'serial', title: 'Serial', type: 'text' },
                        { key: 'deviceModel', title: 'Mã Model', type: 'text' },
                        { key: 'name', title: 'Tên thiết bị', type: 'text' },
                        { key: 'importDate', title: 'Ngày nhập', type: 'date' },
                        { key: 'importId.createdBy.fullName', title: 'Người nhập', type: 'text' },
                        { key: 'action', title: 'Thao tác', type: 'action' }
                    ],
                    actions: [ActionType.SCAN, ActionType.IMPORT_EXCEL, ActionType.TRANSFER],
                    quickTransfers: [
                        {
                            to: WarehouseCode.READY_TO_EXPORT,
                            label: 'Sẵn sàng xuất kho',
                            description: 'QC đạt, chuyển sang kho sẵn sàng xuất',
                            style: 'success' // Mapped to Green in Frontend
                        },
                        {
                            to: WarehouseCode.UNDER_REPAIR,
                            label: 'Sửa chữa',
                            description: 'Lỗi nhẹ, sửa tại kho',
                            style: 'warning' // Mapped to Orange
                        },
                        {
                            to: WarehouseCode.DEFECT,
                            label: 'Lỗi - Chờ BH NCC',
                            description: 'QC không đạt, cần gửi bảo hành',
                            style: 'danger' // Mapped to Red in Frontend
                        }
                    ]
                }
            },
            // 2. Kho Sẵn sàng xuất
            {
                code: WarehouseCode.READY_TO_EXPORT,
                name: 'Sẵn sàng xuất',
                groupId: internalGroup._id,
                color: 'green',
                orderIndex: 3,
                icon: 'check-circle',
                config: {
                    columns: [
                        { key: 'mac', title: 'MAC Address', type: 'text' },
                        { key: 'serial', title: 'Serial', type: 'text' },
                        { key: 'deviceModel', title: 'Mã Model', type: 'text' },
                        { key: 'name', title: 'Tên thiết bị', type: 'text' },
                        { key: 'warehouseUpdatedAt', title: 'Ngày QC', type: 'date' },
                        { key: 'qcBy.name', title: 'Người QC', type: 'text' },
                        { key: 'action', title: 'Thao tác', type: 'action' }
                    ],
                    actions: [ActionType.SCAN, ActionType.IMPORT_EXCEL],
                    quickTransfers: [
                        {
                            to: WarehouseCode.SOLD,
                            label: 'Đang bảo hành',
                            description: 'Xuất kho cho khách/dự án',
                            style: 'primary'
                        },
                        {
                            to: WarehouseCode.DEFECT,
                            label: 'Lỗi - Chờ BH NCC',
                            description: 'Phát hiện lỗi sau QC',
                            style: 'danger'
                        }
                    ]
                }
            },
            // 3. Kho Lỗi
            {
                code: WarehouseCode.DEFECT,
                name: 'Lỗi - Chờ BH NCC',
                groupId: internalGroup._id,
                color: 'red',
                orderIndex: 4,
                icon: 'close-circle',
                config: {
                    columns: [
                        { key: 'mac', title: 'MAC Address', type: 'text' },
                        { key: 'deviceModel', title: 'Mã Model', type: 'text' },
                        { key: 'name', title: 'Tên thiết bị', type: 'text' },
                        { key: 'warehouseUpdatedAt', title: 'Ngày QC', type: 'date' },
                        { key: 'qcNote', title: 'Lý do lỗi', type: 'text' },
                        { key: 'action', title: 'Thao tác', type: 'action' }
                    ],
                    actions: [ActionType.SCAN, ActionType.IMPORT, ActionType.TRANSFER],
                    quickTransfers: [
                        {
                            to: WarehouseCode.IN_WARRANTY,
                            label: 'Đang BH NCC',
                            description: 'Gửi về NCC bảo hành',
                            style: 'warning'
                        },
                        {
                            to: WarehouseCode.READY_TO_EXPORT,
                            label: 'Sẵn sàng xuất kho',
                            description: 'Sửa được trong kho, không cần gửi BH',
                            style: 'success'
                        },
                        {
                            to: WarehouseCode.REMOVED,
                            label: 'Chuyển sang Lỗi - Loại bỏ',
                            description: 'Thiết bị hỏng nặng, không thể sửa chữa',
                            style: 'danger'
                        }
                    ]
                }
            },
            // 3. Kho Sửa chữa
            {
                code: WarehouseCode.UNDER_REPAIR,
                name: 'Sửa chữa',
                groupId: internalGroup._id,
                color: 'orange',
                orderIndex: 2,
                icon: 'wrench',
                config: {
                    columns: [
                        { key: 'mac', title: 'MAC Address', type: 'text' },
                        { key: 'deviceModel', title: 'Mã Model', type: 'text' },
                        { key: 'name', title: 'Tên thiết bị', type: 'text' },
                        { key: 'warehouseUpdatedAt', title: 'Ngày sửa chữa', type: 'date' },
                        { key: 'repairNote', title: 'Lý do lỗi', type: 'text' },
                        { key: 'action', title: 'Thao tác', type: 'action' }
                    ],
                    actions: [ActionType.SCAN, ActionType.IMPORT, ActionType.TRANSFER],
                    quickTransfers: [
                        {
                            to: WarehouseCode.IN_WARRANTY,
                            label: 'Đang BH NCC',
                            description: 'Không sửa được, gửi về NCC bảo hành',
                            style: 'warning'
                        },
                        {
                            to: WarehouseCode.PENDING_QC,
                            label: 'Đang QC',
                            description: 'Sửa được trong kho, QC lại',
                            style: 'success'
                        },
                        {
                            to: WarehouseCode.READY_TO_EXPORT,
                            label: 'Sẵn sàng xuất kho',
                            description: 'Sửa xong, có thể xuất luôn',
                            style: 'success'
                        }
                    ]
                }
            },
            // 4. Đang bảo hành
            {
                code: WarehouseCode.IN_WARRANTY,
                name: 'Đang bảo hành NCC',
                groupId: internalGroup._id,
                color: 'yellow',
                orderIndex: 5,
                icon: 'tool',
                config: {
                    columns: [
                        { key: 'mac', title: 'MAC Address', type: 'text' },
                        { key: 'deviceModel', title: 'Mã Model', type: 'text' },
                        { key: 'name', title: 'Tên thiết bị', type: 'text' },
                        { key: 'warehouseUpdatedAt', title: 'Ngày gửi', type: 'date' },
                        { key: 'warrantyNote', title: 'Ghi chú', type: 'text' },
                        { key: 'action', title: 'Thao tác', type: 'action' }
                    ],
                    actions: [ActionType.TRANSFER],
                    quickTransfers: [
                        {
                            to: WarehouseCode.READY_TO_EXPORT,
                            label: 'Sẵn sàng xuất kho',
                            description: 'NCC trả về, đã sửa xong',
                            style: 'success'
                        },
                        {
                            to: WarehouseCode.DEFECT,
                            label: 'Lỗi - Chờ BH NCC',
                            description: 'NCC trả về vẫn lỗi, cần gửi lại',
                            style: 'danger'
                        },
                        {
                            to: WarehouseCode.REMOVED,
                            label: 'Loại bỏ',
                            description: 'NCC đổi mới (thiết bị cũ loại bỏ)',
                            style: 'danger'
                        },
                        {
                            to: WarehouseCode.PENDING_QC,
                            label: 'Đang QC',
                            description: 'Bảo hành xong, cần QC lại trước khi nhập kho',
                            style: 'warning'
                        }
                    ]
                }
            },
            // 5. Đã xuất - Chưa kích hoạt
            {
                code: WarehouseCode.NOT_ACTIVATED,
                name: 'Chưa kích hoạt bảo hành',
                groupId: exportedGroup._id,
                color: 'cyan', // Distinct color
                orderIndex: 6,
                icon: 'stop',
                config: {
                    columns: [
                        { key: 'mac', title: 'MAC Address', type: 'text' },
                        { key: 'deviceModel', title: 'Mã Model', type: 'text' },
                        { key: 'name', title: 'Tên thiết bị', type: 'text' },
                        { key: 'exportDate', title: 'Ngày xuất', type: 'date' },
                        { key: 'action', title: 'Thao tác', type: 'action' }
                    ],
                    actions: [ActionType.TRANSFER],
                    quickTransfers: [
                        {
                            to: WarehouseCode.SOLD,
                            label: 'Kích hoạt BH',
                            description: 'Kích hoạt bảo hành cho thiết bị',
                            style: 'success'
                        }
                    ]
                }
            },
            // 6. Đã xuất - Trong BH
            {
                code: WarehouseCode.SOLD,
                name: 'Đang bảo hành',
                groupId: exportedGroup._id,
                color: 'gray',
                orderIndex: 7,
                icon: 'export',
                config: {
                    columns: [
                        { key: 'mac', title: 'MAC Address', type: 'text' },
                        { key: 'deviceModel', title: 'Mã Model', type: 'text' },
                        { key: 'name', title: 'Tên thiết bị', type: 'text' },
                        { key: 'exportDate', title: 'Ngày xuất', type: 'date' },
                        { key: 'warrantyActivatedDate', title: 'Ngày kích hoạt BH', type: 'date' },
                        { key: 'warrantyExpiredDate', title: 'Hết hạn BH', type: 'date' },
                        { key: 'action', title: 'Thao tác', type: 'action' }
                    ],
                    actions: [ActionType.TRANSFER], // Enabled Transfer
                    quickTransfers: [
                        {
                            to: WarehouseCode.PENDING_QC,
                            label: 'Khách trả hàng',
                            description: 'Khách trả lại hàng, nhập về kho chờ QC',
                            style: 'warning'
                        },
                        {
                            to: WarehouseCode.SOLD_WARRANTY,
                            label: 'Hết hạn BH',
                            description: 'Chuyển sang trạng thái hết hạn bảo hành',
                            style: 'default'
                        }
                    ]
                }
            },
            // 7. Đã xuất - Hết BH
            {
                code: WarehouseCode.SOLD_WARRANTY,
                name: 'Hết hạn BH',
                groupId: exportedGroup._id,
                color: 'purple',
                orderIndex: 8,
                icon: 'field-time',
                config: {
                    columns: [
                        { key: 'mac', title: 'MAC Address', type: 'text' },
                        { key: 'deviceModel', title: 'Mã Model', type: 'text' },
                        { key: 'name', title: 'Tên thiết bị', type: 'text' },
                        { key: 'exportDate', title: 'Ngày xuất', type: 'date' },
                        { key: 'warrantyExpiredDate', title: 'Ngày hết BH', type: 'date' },
                        { key: 'action', title: 'Thao tác', type: 'action' }
                    ],
                    actions: [ActionType.TRANSFER], // Enabled Transfer
                    quickTransfers: [
                        {
                            to: WarehouseCode.REMOVED,
                            label: 'Chuyển sang Lỗi - Loại bỏ',
                            description: 'Thiết bị hỏng, loại bỏ',
                            style: 'danger'
                        }
                    ]
                }
            },
            // 8. Lỗi - Loại bỏ
            {
                code: WarehouseCode.REMOVED,
                name: 'Lỗi - Loại bỏ',
                groupId: exportedGroup._id,
                color: 'volcano',
                orderIndex: 9,
                icon: 'delete',
                config: {
                    columns: [
                        { key: 'mac', title: 'MAC Address', type: 'text' },
                        { key: 'deviceModel', title: 'Mã Model', type: 'text' },
                        { key: 'name', title: 'Tên thiết bị', type: 'text' },
                        { key: 'removeReason', title: 'Lý do loại bỏ', type: 'text' },
                        { key: 'warehouseUpdatedAt', title: 'Ngày loại bỏ', type: 'date' },
                        { key: 'action', title: 'Thao tác', type: 'action' }
                    ],
                    actions: [],
                    quickTransfers: []
                }
            }
        ];

        const whMap: Record<string, any> = {};
        for (const w of warehousesData) {
            const wh = await this.ensureWarehouse(w);
            whMap[w.code] = wh._id;
        }

        // C. Tạo Transitions (Luật chuyển kho)
        const transitionsData = [
            // Import -> Pending QC
            { from: null, to: WarehouseCode.PENDING_QC, type: TransitionType.IMPORT },

            // QC Pass -> Ready
            { from: WarehouseCode.PENDING_QC, to: WarehouseCode.READY_TO_EXPORT, type: TransitionType.QC_PASS },

            // QC Fail -> Defect
            { from: WarehouseCode.PENDING_QC, to: WarehouseCode.DEFECT, type: TransitionType.QC_FAIL },

            // QC Fail -> Under Repair
            { from: WarehouseCode.PENDING_QC, to: WarehouseCode.UNDER_REPAIR, type: TransitionType.PENDING_QC_TO_UNDER_REPAIR },

            // Defect -> In Warranty
            { from: WarehouseCode.DEFECT, to: WarehouseCode.IN_WARRANTY, type: TransitionType.SEND_WARRANTY },

            // Defect -> Ready To Export (Sửa được trong kho không cần gửi BH)
            { from: WarehouseCode.DEFECT, to: WarehouseCode.READY_TO_EXPORT, type: TransitionType.QC_PASS },

            // Repair -> In Warranty
            { from: WarehouseCode.UNDER_REPAIR, to: WarehouseCode.IN_WARRANTY, type: TransitionType.SEND_WARRANTY },

            // Repair -> Ready
            { from: WarehouseCode.UNDER_REPAIR, to: WarehouseCode.READY_TO_EXPORT, type: TransitionType.QC_PASS },

            // Repair -> Pending QC (Sửa được trong kho, QC lại)
            { from: WarehouseCode.UNDER_REPAIR, to: WarehouseCode.PENDING_QC, type: TransitionType.WARRANTY_REPAIR },

            // In Warranty -> Ready (Nhận lại dùng được)
            { from: WarehouseCode.IN_WARRANTY, to: WarehouseCode.READY_TO_EXPORT, type: TransitionType.RECEIVE_WARRANTY },

            //  In Warranty -> Removed (Đổi mới - MAC cũ hủy)
            { from: WarehouseCode.IN_WARRANTY, to: WarehouseCode.REMOVED, type: TransitionType.WARRANTY_REPLACE },

            //  In Warranty -> Defect (NCC trả về vẫn lỗi, cần gửi lại)
            { from: WarehouseCode.IN_WARRANTY, to: WarehouseCode.DEFECT, type: TransitionType.QC_FAIL },

            //  In Warranty -> Pending QC (Sửa xong - Cần QC lại)
            { from: WarehouseCode.IN_WARRANTY, to: WarehouseCode.PENDING_QC, type: TransitionType.WARRANTY_REPAIR },

            //  Defect -> Removed (Thanh lý hàng lỗi)
            { from: WarehouseCode.DEFECT, to: WarehouseCode.REMOVED, type: TransitionType.SCRAP },

            //  Sold -> Pending QC (Khách trả hàng)
            { from: WarehouseCode.SOLD, to: WarehouseCode.PENDING_QC, type: TransitionType.CUSTOMER_RETURN },

            // Ready -> Sold (Xuất bán)
            { from: WarehouseCode.READY_TO_EXPORT, to: WarehouseCode.SOLD, type: TransitionType.EXPORT },

            // Ready -> Not Activated (Xuất chưa kích hoạt)
            { from: WarehouseCode.READY_TO_EXPORT, to: WarehouseCode.NOT_ACTIVATED, type: TransitionType.EXPORT_NO_WARRANTY },

            // Not Activated -> Sold (Kích hoạt bảo hành)
            { from: WarehouseCode.NOT_ACTIVATED, to: WarehouseCode.SOLD, type: TransitionType.ACTIVATE_WARRANTY },

            // Ready -> Defect
            { from: WarehouseCode.READY_TO_EXPORT, to: WarehouseCode.DEFECT, type: TransitionType.QC_FAIL },

            // Sold -> Sold Warranty
            { from: WarehouseCode.SOLD, to: WarehouseCode.SOLD_WARRANTY, type: TransitionType.WARRANTY_EXPIRED },

            // Sold Warranty -> Removed
            { from: WarehouseCode.SOLD_WARRANTY, to: WarehouseCode.REMOVED, type: TransitionType.SCRAP },

        ];

        for (const t of transitionsData) {
            const fromId = t.from ? whMap[t.from] : null;
            const toId = whMap[t.to];
            if ((!fromId && t.from !== null) || !toId) {
                this.logger.warn(`Skipping transition ${t.from} -> ${t.to}: ID not found`);
                continue;
            }
            await this.ensureTransition(fromId, toId, t.type);
        }
    }

    // --- 5. SEED SHARED DATA ---
    async seedSharedData() {
        try {
            // 1. Seed Groups
            const groups = [
                { code: 'ORIGIN', name: 'Nguồn gốc', description: 'Nguồn gốc của thiết bị (Nội địa, Nhập khẩu...)' },
                { code: 'PROJECT', name: 'Dự án', description: 'Dự án (Hà Nội, Cà Mau...)' },
                { code: 'MODEL', name: 'Mã thiết bị', description: 'Danh sách SKU/Model thiết bị' },
                { code: 'UNIT', name: 'Đơn vị tính', description: 'Đơn vị tính (Cái, Chiếc...)' },
            ];

            try {
                await this.sharedDataRepository.insertManyGroups(groups);
            } catch (error: any) {
                if (error.code !== 11000) {
                    // console.error('Error seeding groups:', error);
                }
            }

            // 2. Fetch Groups to get IDs
            const allGroups = await this.sharedDataRepository.findAllGroups();
            const groupMap = new Map(allGroups.map(g => [g.code, (g as any)._id]));

            const dataToSeed = [];

            // ORIGIN Data
            const originId = groupMap.get('ORIGIN');
            if (originId) {
                dataToSeed.push(
                    { code: 'DOMESTIC', name: 'Nội địa', description: 'Hàng được sản xuất trong nước', groupId: originId, order: 1 },
                    { code: 'IMPORT', name: 'Nhập khẩu', description: 'Hàng được nhập khẩu', groupId: originId, order: 2 },
                    { code: 'WARRANTY_RETURN', name: 'Trả bảo hành', description: 'Hàng được NSX bảo hành', groupId: originId, order: 3 },
                );
            }

            // PROJECT Data
            const projectId = groupMap.get('PROJECT');
            if (projectId) {
                dataToSeed.push(
                    { code: 'PRJ_HANOI', name: 'Dự án Hà Nội', description: 'Dự án được lắp đặt tại Hà Nội', groupId: projectId, order: 1 },
                    { code: 'PRJ_HAGIANG', name: 'Dự án Hà Giang', description: 'Dự án được lắp đặt tại Hà Giang', groupId: projectId, order: 2 },
                    { code: 'PRJ_NINHBINH', name: 'Dự án Ninh Bình', description: 'Dự án được lắp đặt tại Ninh Bình', groupId: projectId, order: 3 },
                    { code: 'PRJ_CAMAU', name: 'Dự án Cà Mau', description: 'Dự án được lắp đặt tại Cà Mau', groupId: projectId, order: 4 },
                );
            }

            // MODEL Data
            const modelId = groupMap.get('MODEL');
            if (modelId) {
                dataToSeed.push(
                    { code: 'AV-C251241L5LBA-1A', name: 'Camera Indoor 2 MP', description: 'Camera có AI, sử dụng trong nhà', groupId: modelId, order: 1 },
                    { code: 'AV-C251141L5UA-1A', name: 'Camera Outdoor 5 MP', description: 'Camera cỡ lớn, tich hợp AI', groupId: modelId, order: 2 },
                    { code: 'AV-C251147L2BJ', name: 'Barrier tự động', description: 'Barrie dùng cho dự án chấm công', groupId: modelId, order: 3 },
                    { code: 'AV-C251137L6BT', name: 'Màn hình', description: 'Màn hình quan sát chấm công', groupId: modelId, order: 4 },
                );
            }

            // UNIT Data
            const unitId = groupMap.get('UNIT');
            if (unitId) {
                dataToSeed.push(
                    { code: 'CAI', name: 'Cái', groupId: unitId },
                    { code: 'CHIEC', name: 'Chiếc', groupId: unitId },
                    { code: 'BO', name: 'Bộ', groupId: unitId },
                );
            }

            if (dataToSeed.length > 0) {
                try {
                    await this.sharedDataRepository.insertManyData(dataToSeed);
                    // console.log(`Seeded ${dataToSeed.length} shared data items.`);
                } catch (error: any) {
                    if (error.code !== 11000) {
                        // console.error('Error seeding data:', error);
                    }
                }
            }
        } catch (err) {
            console.error('Seed Shared Data Failed', err);
        }
    }

    // --- HELPER METHODS ---

    private async ensureGroup(name: string, code: string, orderIndex: number) {
        let group = await this.warehouseGroupModel.findOne({ name });

        if (!group) {
            // Try finding by code if name changed (rare but good for consistency)
            group = await this.warehouseGroupModel.findOne({ code });
        }

        if (!group) {
            group = await this.warehouseGroupModel.create({
                name,
                code,
                orderIndex,
                isActive: true
            });
            this.logger.log(`Created Group: ${name} [${code}]`);
        } else {
            // Update code if missing
            if (!group.code) {
                group.code = code;
                await group.save();
                this.logger.log(`Updated Group Code: ${name} -> ${code}`);
            }
        }
        return group;
    }

    private async ensureWarehouse(data: any) {
        let wh = await this.warehouseModel.findOne({ code: data.code });
        if (!wh) {
            wh = await this.warehouseModel.create(data);
            this.logger.log(`Created Warehouse: ${data.name}`);
        } else {
            // Update config if exists
            wh.name = data.name;
            wh.config = data.config;
            wh.groupId = data.groupId;
            wh.color = data.color;
            wh.icon = data.icon;
            wh.orderIndex = data.orderIndex;
            if (data.isActive !== undefined) wh.isActive = data.isActive;
            await wh.save();
            this.logger.log(`Updated Warehouse: ${data.name}`);
        }
        return wh;
    }

    private async ensureTransition(fromId: any, toId: any, transitionType: string) {
        const all = await this.warehouseTransitionModel.find();

        const exists = all.find((t: any) => {
            const dbFrom = t.fromWarehouseId ? String(t.fromWarehouseId) : 'null';
            const inputFrom = fromId ? String(fromId) : 'null';

            return dbFrom === inputFrom &&
                String(t.toWarehouseId) === String(toId) &&
                t.transitionType === transitionType;
        });

        if (!exists) {
            await this.warehouseTransitionModel.create({
                fromWarehouseId: fromId,
                toWarehouseId: toId,
                transitionType: transitionType,
                allowedRoles: ['super_admin', 'warehouse_staff'],
                isActive: true
            });
            this.logger.log(`Created Transition: ${fromId ? fromId : 'NULL'} -> ${toId} [${transitionType}]`);
        }
    }
}