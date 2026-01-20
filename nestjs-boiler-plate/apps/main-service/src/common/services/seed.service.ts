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
  ) { }

  async onModuleInit() {
    this.logger.log('Starting Seed Service...');
    await this.seedRoles();
    await this.seedUsers();
    await this.seedWarehousesAndTransitions();
    await this.seedDevices();
    this.logger.log('Seed Service Completed.');
  }

  // --- 1. SEED ROLES ---
  private async seedRoles() {
    const roles = [
      { name: 'Super Admin', code: 'super_admin', description: 'Full access' },
      { name: 'Warehouse Staff', code: 'warehouse_staff', description: 'Manage inventory' },
      { name: 'QC Staff', code: 'qc_staff', description: 'Quality control' },
      { name: 'Accountant', code: 'accountant', description: 'View reports' },
    ];

    for (const role of roles) {
      const exists = await this.fncRoleModel.findOne({ code: role.code });
      if (!exists) {
        await this.fncRoleModel.create(role);
        this.logger.log(`Created Role: ${role.name}`);
      }
    }
  }

  // --- 2. SEED USERS ---
  private async seedUsers() {
    const adminRole = await this.fncRoleModel.findOne({ code: 'super_admin' });
    if (!adminRole) return;

    const adminEmail = 'admin@example.com';
    const exists = await this.userModel.findOne({ email: adminEmail });
    if (!exists) {
      const hashedPassword = await bcrypt.hash('123456', 10);
      await this.userModel.create({
        email: adminEmail,
        password: hashedPassword,
        name: 'Super Admin',
        username: 'admin',
        roles: [adminRole._id],
        isActive: true,
      });
      this.logger.log(`Created User: ${adminEmail}`);
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
            { key: 'serial', title: 'Serial', type: 'text' },
            { key: 'deviceModel', title: 'Mã Model', type: 'text' },
            { key: 'name', title: 'Tên thiết bị', type: 'text' },
            { key: 'mac', title: 'MAC Address', type: 'text' },
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
        orderIndex: 2,
        icon: 'check-circle',
        config: {
          columns: [
            { key: 'serial', title: 'Serial', type: 'text' },
            { key: 'deviceModel', title: 'Mã Model', type: 'text' },
            { key: 'name', title: 'Tên thiết bị', type: 'text' },
            { key: 'mac', title: 'MAC Address', type: 'text' },
            { key: 'warehouseUpdatedAt', title: 'Ngày QC', type: 'date' },
            { key: 'qcBy.name', title: 'Người QC', type: 'text' },
            { key: 'action', title: 'Thao tác', type: 'action' }
          ],
          actions: [ActionType.SCAN, ActionType.IMPORT_EXCEL, ActionType.TRANSFER],
          quickTransfers: [
            {
              to: WarehouseCode.SOLD,
              label: 'Đã xuất - Trong BH',
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
        orderIndex: 3,
        icon: 'close-circle',
        config: {
          columns: [
            { key: 'serial', title: 'Serial', type: 'text' },
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
            }
          ]
        }
      },
      // 4. Đang bảo hành
      {
        code: WarehouseCode.IN_WARRANTY,
        name: 'Đang bảo hành NCC',
        groupId: internalGroup._id,
        color: 'orange',
        orderIndex: 1,
        icon: 'tool',
        config: {
          columns: [
            { key: 'serial', title: 'Serial', type: 'text' },
            { key: 'deviceModel', title: 'Mã Model', type: 'text' },
            { key: 'name', title: 'Tên thiết bị', type: 'text' },
            { key: 'warehouseUpdatedAt', title: 'Ngày gửi', type: 'date' },
            { key: 'warrantyNote', title: 'Ghi chú', type: 'text' },
            { key: 'action', title: 'Thao tác', type: 'action' }
          ],
          actions: [ActionType.TRANSFER], // Receive is technically a transfer back
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
            }
          ]
        }
      },
      // 5. Đã xuất - Trong BH
      {
        code: WarehouseCode.SOLD,
        name: 'Đã xuất - Trong BH',
        groupId: exportedGroup._id,
        color: 'gray',
        orderIndex: 1,
        icon: 'export',
        config: {
          columns: [
            { key: 'serial', title: 'Serial', type: 'text' },
            { key: 'deviceModel', title: 'Mã Model', type: 'text' },
            { key: 'name', title: 'Tên thiết bị', type: 'text' },
            { key: 'exportDate', title: 'Ngày xuất', type: 'date' },
            { key: 'warrantyActivatedDate', title: 'Ngày kích hoạt BH', type: 'date' },
            { key: 'warrantyExpiredDate', title: 'Hết hạn BH', type: 'date' },
            { key: 'action', title: 'Thao tác', type: 'action' }
          ],
          actions: [],
          quickTransfers: []
        }
      },
      // 6. Đã xuất - Hết BH
      {
        code: WarehouseCode.SOLD_WARRANTY,
        name: 'Đã xuất - Hết BH',
        groupId: exportedGroup._id,
        color: 'purple',
        orderIndex: 2,
        icon: 'field-time',
        config: {
          columns: [
            { key: 'serial', title: 'Serial', type: 'text' },
            { key: 'deviceModel', title: 'Mã Model', type: 'text' },
            { key: 'name', title: 'Tên thiết bị', type: 'text' },
            { key: 'exportDate', title: 'Ngày xuất', type: 'date' },
            { key: 'warrantyExpiredDate', title: 'Ngày hết BH', type: 'date' },
            { key: 'action', title: 'Thao tác', type: 'action' }
          ],
          actions: [],
          quickTransfers: []
        }
      },
      // 7. Lỗi - Loại bỏ
      {
        code: WarehouseCode.REMOVED,
        name: 'Lỗi - Loại bỏ',
        groupId: exportedGroup._id,
        color: 'volcano',
        orderIndex: 3,
        icon: 'delete',
        config: {
          columns: [
            { key: 'serial', title: 'Serial', type: 'text' },
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

      // Defect -> In Warranty
      { from: WarehouseCode.DEFECT, to: WarehouseCode.IN_WARRANTY, type: TransitionType.SEND_WARRANTY },

      // In Warranty -> Ready (Nhận lại dùng được)
      { from: WarehouseCode.IN_WARRANTY, to: WarehouseCode.READY_TO_EXPORT, type: TransitionType.RECEIVE_WARRANTY }, // KEEP for backward compatibility or quick fix

      // [NEW] In Warranty -> Removed (Đổi mới - Serial cũ hủy)
      { from: WarehouseCode.IN_WARRANTY, to: WarehouseCode.REMOVED, type: TransitionType.WARRANTY_REPLACE },

      // [NEW] In Warranty -> Pending QC (Sửa xong - Cần QC lại)
      { from: WarehouseCode.IN_WARRANTY, to: WarehouseCode.PENDING_QC, type: TransitionType.WARRANTY_REPAIR },

      // [NEW] Defect -> Removed (Thanh lý hàng lỗi)
      { from: WarehouseCode.DEFECT, to: WarehouseCode.REMOVED, type: TransitionType.SCRAP },

      // [NEW] Sold -> Pending QC (Khách trả hàng)
      { from: WarehouseCode.SOLD, to: WarehouseCode.PENDING_QC, type: TransitionType.CUSTOMER_RETURN },

      // Ready -> Sold (Xuất bán)
      { from: WarehouseCode.READY_TO_EXPORT, to: WarehouseCode.SOLD, type: TransitionType.EXPORT },
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

  // --- 4. SEED DEVICES (Mock Data) ---
  private async seedDevices() {
    // A. Ensure Category
    let category = await this.categoryModel.findOne({ name: 'Thiết bị an ninh' });
    if (!category) {
      category = await this.categoryModel.create({
        name: 'Thiết bị an ninh',
        description: 'Camera, Barrier, Máy chấm công'
      });
      this.logger.log('Created Default Category');
    }

    // B. Ensure Import Record
    let importRecord = await this.deviceImportModel.findOne({ code: 'IMP-INIT-001' });
    if (!importRecord) {
      importRecord = await this.deviceImportModel.create({
        code: 'IMP-INIT-001',
        origin: 'Vietnam',
        supplier: 'Hikvision Vietnam',
        totalQuantity: 100,
        status: 'COMPLETED',
        importDate: new Date(),
        importedBy: 'Admin'
      });
      this.logger.log('Created Default Import Record');
    }

    // C. Create Devices in PENDING_QC
    const pendingQcWh = await this.warehouseModel.findOne({ code: WarehouseCode.PENDING_QC });
    if (pendingQcWh) {
      const count = await this.deviceModel.countDocuments({ warehouseId: pendingQcWh._id });
      if (count < 10) {
        const devices = [];
        for (let i = 0; i < 10; i++) {
          devices.push({
            serial: `SN-PENDING-${Date.now()}-${i}`,
            name: `Camera AI Series ${i}`,
            deviceModel: `AI-CAM-0${i}`,
            unit: 'Pcs',
            categoryId: category._id,
            warehouseId: pendingQcWh._id,
            importId: importRecord._id,
            qcStatus: 'PENDING',
            importDate: new Date(),
          });
        }
        await this.deviceModel.insertMany(devices);
        this.logger.log(`Seeded 10 devices to ${WarehouseCode.PENDING_QC}`);
      }
    }

    // D. Create Devices in READY_TO_EXPORT
    const readyWh = await this.warehouseModel.findOne({ code: WarehouseCode.READY_TO_EXPORT });
    if (readyWh) {
      const count = await this.deviceModel.countDocuments({ warehouseId: readyWh._id });
      if (count < 5) {
        const devices = [];
        for (let i = 0; i < 5; i++) {
          devices.push({
            serial: `SN-READY-${Date.now()}-${i}`,
            name: `Barrier Gate B${i}`,
            deviceModel: `BARRIER-0${i}`,
            unit: 'Set',
            categoryId: category._id,
            warehouseId: readyWh._id,
            importId: importRecord._id,
            qcStatus: 'PASS',
            importDate: new Date(),
          });
        }
        await this.deviceModel.insertMany(devices);
        this.logger.log(`Seeded 5 devices to ${WarehouseCode.READY_TO_EXPORT}`);
      }
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
      wh.config = data.config;
      wh.groupId = data.groupId;
      wh.color = data.color;
      wh.icon = data.icon;
      await wh.save();
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